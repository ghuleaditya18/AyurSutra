import { useState, useEffect, useMemo } from 'react'
import { getAvailableSlots } from '../api/bookings'
import { formatApiError } from '../utils/formatError'

const DAILY_SLOT_STARTS = [
  { hour: 9, minute: 0 },
  { hour: 11, minute: 0 },
  { hour: 13, minute: 30 },
  { hour: 16, minute: 0 },
  { hour: 18, minute: 0 },
]

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

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

    if (slotEndMin > 19 * 60) continue
    if (isToday && startMin <= currentTotalMinutes) continue

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

const EditAppointmentModal = ({ appointment, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    date: appointment?.date || '',
    start_time: appointment?.start_time || '',
    status: appointment?.status || 'applied',
  })
  const [backendSlots, setBackendSlots] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const todayIso = new Date().toISOString().slice(0, 10)
  const duration = appointment?.therapy_duration || 45

  const isSunday = useMemo(() => {
    if (!formData.date) return false
    const parts = formData.date.split('-').map(Number)
    if (parts.length !== 3) return false
    const d = new Date(parts[0], parts[1] - 1, parts[2])
    return d.getDay() === 0
  }, [formData.date])

  useEffect(() => {
    let active = true
    if (appointment?.therapy && formData.date && !isSunday) {
      const therapyId = typeof appointment.therapy === 'object' ? appointment.therapy.id : appointment.therapy
      Promise.resolve().then(() => {
        if (active) setLoadingSlots(true)
      })
      getAvailableSlots({
        therapy: therapyId,
        date: formData.date,
        therapist: appointment.therapist || undefined,
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
  }, [appointment, formData.date, isSunday])

  const candidateSlots = useMemo(() => {
    if (!formData.date || isSunday) return []

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const isToday = formData.date === todayIso

    const raw = (backendSlots && backendSlots.length > 0)
      ? backendSlots.map((s) => ({
          start_time: s.start_time,
          end_time: s.end_time,
          label: s.label,
          value: s.start_time,
          available: s.available !== false,
        }))
      : generateSlotsForDuration(duration, formData.date).map((s) => ({
          ...s,
          available: true,
        }))

    // If appointment already has a start_time on this date, ensure it appears as an option
    const list = isToday
      ? raw.filter((slot) => parseTimeToMinutes(slot.start_time) > currentMinutes || slot.start_time === appointment?.start_time)
      : raw

    if (formData.start_time && !list.some((s) => s.start_time === formData.start_time)) {
      list.unshift({
        start_time: formData.start_time,
        end_time: appointment?.end_time || '',
        label: `${formData.start_time} (Current Slot)`,
        value: formData.start_time,
        available: true,
      })
    }

    return list
  }, [formData.date, formData.start_time, isSunday, backendSlots, duration, todayIso, appointment])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'date' ? { start_time: '' } : {}),
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.date) {
      setError('Please select an appointment date.')
      return
    }
    if (isSunday) {
      setError('Hospital is closed on Sundays.')
      return
    }
    if (!formData.start_time) {
      setError('Please select a time slot.')
      return
    }

    try {
      setSaving(true)
      setError('')
      await onSave(appointment.id, formData)
      onClose()
    } catch (err) {
      setError(formatApiError(err, 'Failed to update appointment.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.75rem',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1f2937' }}>
            ✏️ Edit Appointment #{appointment?.id}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}
          >
            ✕
          </button>
        </div>

        <div style={{ background: '#f9fafb', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          <div><strong>Patient:</strong> {appointment?.patient_name || appointment?.name || 'Patient'}</div>
          <div><strong>Therapy:</strong> {appointment?.therapy_name || 'Therapy'}</div>
        </div>

        {error && <div className="toast toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Appointment Date</label>
            <input
              type="date"
              name="date"
              className="form-input"
              value={formData.date}
              min={todayIso}
              onChange={handleChange}
            />
            {isSunday && (
              <span className="form-error" style={{ display: 'block', marginTop: '0.25rem' }}>
                ⚠️ Hospital is closed on Sundays.
              </span>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Time Slot</label>
            <select
              name="start_time"
              className="form-input"
              value={formData.start_time}
              onChange={handleChange}
              disabled={!formData.date || isSunday || loadingSlots}
            >
              {!formData.date ? (
                <option value="">Select date first</option>
              ) : isSunday ? (
                <option value="">Closed on Sundays</option>
              ) : loadingSlots ? (
                <option value="">Checking slots...</option>
              ) : candidateSlots.length === 0 ? (
                <option value="">No available slots for this date</option>
              ) : (
                <>
                  <option value="">Select a time slot</option>
                  {candidateSlots.map((slot) => (
                    <option key={slot.start_time} value={slot.start_time} disabled={!slot.available && slot.start_time !== appointment?.start_time}>
                      {slot.label} {!slot.available && slot.start_time !== appointment?.start_time ? ' (Booked)' : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Appointment Status</label>
            <select
              name="status"
              className="form-input"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="applied">Applied (Pending Review)</option>
              <option value="scheduled">Scheduled (Confirmed)</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn"
              style={{ background: '#f3f4f6', color: '#374151' }}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || isSunday || !formData.date || !formData.start_time}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditAppointmentModal
