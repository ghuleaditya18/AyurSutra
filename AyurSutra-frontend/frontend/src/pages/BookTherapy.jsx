import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSchedule, getAvailableSlots } from '../api/bookings'
import { getTherapies, getTherapists } from '../api/therapies'
import Footer from '../components/Footer'
import LoadingSpinner from '../components/LoadingSpinner'
import Sidebar from '../components/Sidebar'
import { formatApiError } from '../utils/formatError'

const getTodayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
const todayIso = getTodayIso()

// 5 designated daily session start times with healthy breaks in between
const DAILY_SLOT_STARTS = [
  { hour: 9, minute: 0 },
  { hour: 11, minute: 0 },
  { hour: 13, minute: 30 },
  { hour: 16, minute: 0 },
  { hour: 18, minute: 0 },
]

// Helper to generate 5 spaced slot intervals based on therapy duration and current time for today
const generateSlotsForDuration = (duration, selectedDate) => {
  if (!duration || duration <= 0) return []
  const slots = []

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const isToday = selectedDate === todayStr
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes()

  for (const session of DAILY_SLOT_STARTS) {
    const startMin = session.hour * 60 + session.minute
    const slotEndMin = startMin + duration

    // Must not exceed closing time (7:00 PM = 1140 min)
    if (slotEndMin > 19 * 60) continue

    // If selected date is today, exclude slots whose start time has already passed
    if (isToday && startMin <= currentTotalMinutes) {
      continue
    }

    const formatTime12 = (mins) => {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      const h12 = h % 12 || 12
      const ampm = h < 12 ? 'AM' : 'PM'
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
    }

    const formatTime24 = (mins) => {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    }

    slots.push({
      start_time: formatTime24(startMin),
      end_time: formatTime24(slotEndMin),
      label: `${formatTime12(startMin)} - ${formatTime12(slotEndMin)}`,
      value: formatTime24(startMin),
    })
  }

  return slots
}

const BookTherapy = () => {
  const navigate = useNavigate()
  const [therapies, setTherapies] = useState([])
  const [therapists, setTherapists] = useState([])
  const [formData, setFormData] = useState({
    therapy: '',
    therapist: '',
    date: '',
    start_time: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')
  const [backendSlots, setBackendSlots] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([getTherapies(), getTherapists()])
      .then(([therapyRes, therapistRes]) => {
        if (active) {
          setTherapies(Array.isArray(therapyRes.data) ? therapyRes.data : therapyRes.data.results || [])
          setTherapists(Array.isArray(therapistRes.data) ? therapistRes.data : therapistRes.data.results || [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setErrors({ form: 'Could not load therapies or therapist data.' })
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const selectedTherapy = useMemo(
    () => therapies.find((t) => String(t.id) === String(formData.therapy)),
    [therapies, formData.therapy]
  )

  const isSunday = useMemo(() => {
    if (!formData.date) return false
    const parts = formData.date.split('-').map(Number)
    if (parts.length !== 3) return false
    const d = new Date(parts[0], parts[1] - 1, parts[2])
    return d.getDay() === 0
  }, [formData.date])

  // Fetch slot availability from backend when therapy, date, and therapist change
  useEffect(() => {
    let active = true
    if (formData.therapy && formData.date && !isSunday) {
      Promise.resolve().then(() => {
        if (active) setLoadingSlots(true)
      })
      getAvailableSlots({
        therapy: formData.therapy,
        date: formData.date,
        therapist: formData.therapist || undefined,
      })
        .then((res) => {
          if (active) {
            setBackendSlots(res.data.slots || [])
            setLoadingSlots(false)
          }
        })
        .catch(() => {
          if (active) {
            setBackendSlots(null)
            setLoadingSlots(false)
          }
        })
    }

    return () => {
      active = false
    }
  }, [formData.therapy, formData.date, formData.therapist, isSunday])

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

  // Generated candidate slots based on therapy duration
  const availableSlots = useMemo(() => {
    if (!selectedTherapy || !selectedTherapy.duration || !formData.date || isSunday) return []

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const isToday = formData.date === todayIso

    const candidateSlots = (backendSlots && backendSlots.length > 0)
      ? backendSlots.map((s) => ({
          start_time: s.start_time,
          end_time: s.end_time,
          label: s.label,
          value: s.start_time,
          available: s.available !== false,
        }))
      : generateSlotsForDuration(selectedTherapy.duration, formData.date).map((s) => ({
          ...s,
          available: true,
        }))

    // Strictly enforce: If selected date is today, only show future slots!
    if (isToday) {
      return candidateSlots.filter((slot) => parseTimeToMinutes(slot.start_time) > currentMinutes)
    }

    return candidateSlots
  }, [selectedTherapy, backendSlots, formData.date, isSunday])

  const matchingTherapists = useMemo(() => {
    if (!selectedTherapy) return therapists
    if (!selectedTherapy.name) return therapists
    return therapists.filter((t) => {
      if (!t.specialization) return true
      return t.specialization.toLowerCase().includes(selectedTherapy.name.toLowerCase())
    })
  }, [therapists, selectedTherapy])

  const handleChange = (event) => {
    const { name, value } = event.target
    const nextData = { ...formData, [name]: value }

    if (name === 'therapy') {
      nextData.therapist = ''
      nextData.start_time = ''
    }
    if (name === 'date') {
      nextData.start_time = ''
    }
    if (name === 'therapist') {
      nextData.start_time = ''
    }

    setFormData(nextData)
    setErrors({ ...errors, [name]: '', form: '' })
  }

  const validate = () => {
    const nextErrors = {}
    if (!formData.therapy) nextErrors.therapy = 'Please select a therapy.'
    if (!formData.date) nextErrors.date = 'Appointment date is required.'
    if (formData.date && isSunday) {
      nextErrors.date = 'The hospital is closed on Sundays. Please select Monday through Saturday.'
    }
    if (!formData.start_time) nextErrors.start_time = 'Please select an appointment time slot.'
    if (formData.date === todayIso && formData.start_time) {
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      if (parseTimeToMinutes(formData.start_time) <= currentMinutes) {
        nextErrors.start_time = 'This time slot has already passed today. Please select an upcoming slot.'
      }
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setToast('')
    if (!validate()) return
    setSubmitting(true)

    try {
      await createSchedule({
        therapy: Number(formData.therapy),
        therapist: formData.therapist ? Number(formData.therapist) : null,
        date: formData.date,
        start_time: formData.start_time,
      })
      setToast('Therapy booking requested (Status: Applied). Waiting for therapist confirmation.')
      setTimeout(() => navigate('/dashboard'), 1200)
    } catch (_error) {
      const fieldErrors = {}
      if (_error.response?.data && typeof _error.response.data === 'object') {
        for (const [key, val] of Object.entries(_error.response.data)) {
          if (Array.isArray(val)) fieldErrors[key] = val.join(' ')
          else if (typeof val === 'string') fieldErrors[key] = val
        }
      }
      setErrors({
        ...fieldErrors,
        form: formatApiError(_error, 'Booking failed. Please check the details.'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <header className="topbar">
          <h1>Book Therapy</h1>
        </header>

        <div className="page-body">
          <section className="card">
            <h2 className="card-title">Schedule a therapy session</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Working Hours: Monday – Saturday, 9:00 AM – 7:00 PM (Closed on Sundays).
              Time slots are automatically sized to your therapy's duration.
            </p>

            {loading ? <LoadingSpinner /> : null}

            {!loading && (
              <form onSubmit={handleSubmit}>
                {toast && <div className="toast toast-success">{toast}</div>}
                {errors.form && <div className="toast toast-error">{errors.form}</div>}

                <div className="form-grid">
                  {/* THERAPY SELECTION */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="therapy">
                      Therapy
                    </label>
                    <select
                      className="form-input"
                      id="therapy"
                      name="therapy"
                      value={formData.therapy}
                      onChange={handleChange}
                    >
                      <option value="">Select a therapy</option>
                      {therapies.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {t.duration} mins (₹{t.price})
                        </option>
                      ))}
                    </select>
                    {errors.therapy && <span className="form-error">{errors.therapy}</span>}
                  </div>

                  {/* PREFERRED THERAPIST */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="therapist">
                      Preferred Therapist
                    </label>
                    <select
                      className="form-input"
                      id="therapist"
                      name="therapist"
                      value={formData.therapist}
                      onChange={handleChange}
                    >
                      <option value="">Assign automatically</option>
                      {matchingTherapists.map((therapist) => (
                        <option key={therapist.id} value={therapist.id}>
                          {therapist.name || therapist.email}
                          {therapist.specialization ? ` (${therapist.specialization})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* DATE PICKER */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="date">
                      Appointment Date
                    </label>
                    <input
                      className="form-input"
                      id="date"
                      name="date"
                      type="date"
                      min={todayIso}
                      value={formData.date}
                      onChange={handleChange}
                    />
                    {isSunday && (
                      <span className="form-error" style={{ display: 'block', marginTop: '0.25rem' }}>
                        ⚠️ Hospital is closed on Sundays. Please select Monday – Saturday.
                      </span>
                    )}
                    {errors.date && !isSunday && <span className="form-error">{errors.date}</span>}
                  </div>

                  {/* TIME SLOT SELECTOR */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="start_time">
                      Available Time Slot {selectedTherapy ? `(${selectedTherapy.duration} mins)` : ''}
                    </label>
                    <select
                      className="form-input"
                      id="start_time"
                      name="start_time"
                      value={formData.start_time}
                      disabled={!formData.therapy || !formData.date || isSunday || loadingSlots}
                      onChange={handleChange}
                    >
                      {!formData.therapy ? (
                        <option value="">Select a therapy first</option>
                      ) : !formData.date ? (
                        <option value="">Select an appointment date first</option>
                      ) : isSunday ? (
                        <option value="">Closed on Sundays</option>
                      ) : loadingSlots ? (
                        <option value="">Checking slot availability...</option>
                      ) : availableSlots.length === 0 ? (
                        <option value="">
                          {formData.date === todayIso
                            ? 'All appointment slots for today have passed. Please select a future date.'
                            : 'No slots available for this therapy duration'}
                        </option>
                      ) : (
                        <>
                          <option value="">Choose an available slot</option>
                          {availableSlots.map((slot) => (
                            <option
                              key={slot.start_time}
                              value={slot.start_time}
                              disabled={!slot.available}
                            >
                              {slot.label} {!slot.available ? ' — (Unavailable / Booked)' : ''}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    {errors.start_time && <span className="form-error">{errors.start_time}</span>}
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <button
                    className="btn btn-primary"
                    disabled={submitting || isSunday || !formData.therapy || !formData.date || !formData.start_time}
                    type="submit"
                  >
                    {submitting ? 'Submitting Booking...' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
        <Footer />
      </main>
    </div>
  )
}

export default BookTherapy
