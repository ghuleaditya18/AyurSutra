import { useEffect, useMemo, useState } from 'react'
import { getMySchedules, updateBookingStatus, updateSchedule, deleteSchedule } from '../api/bookings'
import EditAppointmentModal from '../components/EditAppointmentModal'
import Footer from '../components/Footer'
import LoadingSpinner from '../components/LoadingSpinner'
import Sidebar from '../components/Sidebar'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { formatApiError } from '../utils/formatError'

const todayIso = new Date().toISOString().slice(0, 10)

const getPatientName = (item) => item.patient_name || item.patient?.name || item.name || item.patient?.email || 'Patient'
const getTherapyName = (item) => item.therapy_name || item.therapy?.name || item.therapy || 'Therapy'

const TherapistDashboard = () => {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [editingAppointment, setEditingAppointment] = useState(null)

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await getMySchedules()
        setAppointments(Array.isArray(response.data) ? response.data : response.data.results || [])
      } catch {
        setError('Could not load therapist appointments.')
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [])

  const todayAppointments = appointments.filter((item) => item.date === todayIso && item.status === 'scheduled')
  const appliedCount = appointments.filter((item) => item.status === 'applied').length
  const uniquePatients = useMemo(() => new Set(appointments.map((item) => item.patient || item.patient_id || item.email)).size, [appointments])
  const completed = appointments.filter((item) => item.status === 'completed').length
  const scheduledCount = appointments.filter((item) => item.status === 'scheduled').length

  const handleStatusChange = async (id, status) => {
    try {
      setError('')
      setToast('')
      await updateBookingStatus(id, status)
      setAppointments((items) => items.map((item) => (item.id === id ? { ...item, status } : item)))
      setToast(`Appointment status updated to "${status}".`)
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      setError(formatApiError(err, 'Could not update appointment status.'))
    }
  }

  const handleSaveEdit = async (id, payload) => {
    const res = await updateSchedule(id, payload)
    const updated = res.data
    setAppointments((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updated } : item))
    )
    setToast('Appointment details updated successfully.')
    setTimeout(() => setToast(''), 3000)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) return
    try {
      setError('')
      setToast('')
      await deleteSchedule(id)
      setAppointments((items) => items.filter((item) => item.id !== id))
      setToast('Appointment deleted successfully.')
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      setError(formatApiError(err, 'Could not delete appointment.'))
    }
  }

  const renderRows = (items, showDate = false) => items.map((item) => (
    <tr key={item.id}>
      <td>{showDate ? item.date : `${item.start_time} - ${item.end_time}`}</td>
      <td>{getPatientName(item)}</td>
      <td>{getTherapyName(item)}</td>
      {showDate && <td>{item.start_time} - {item.end_time}</td>}
      <td><StatusBadge status={item.status} /></td>
      <td>
        <select
          className="form-input status-select"
          value={item.status || 'applied'}
          onChange={(event) => handleStatusChange(item.id, event.target.value)}
        >
          {item.status === 'applied' && <option value="applied">Applied (Pending)</option>}
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
            title="Edit Appointment"
            onClick={() => setEditingAppointment(item)}
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '0.3rem 0.6rem',
              fontSize: '0.78rem',
              background: '#fee2e2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
            }}
            title="Delete Appointment"
            onClick={() => handleDelete(item.id)}
          >
            🗑️ Delete
          </button>
        </div>
      </td>
    </tr>
  ))

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <header className="topbar"><h1>Therapist Dashboard</h1><StatusBadge status="therapist" /></header>
        <div className="page-body">
          <div className="stats-grid">
            <StatCard icon="⏳" label="Applied (Pending Review)" value={appliedCount} color="#d97706" bg="#fef3c7" />
            <StatCard icon="📅" label="Confirmed Scheduled" value={scheduledCount} color="#2563eb" bg="#dbeafe" />
            <StatCard icon="☉" label="Unique Patients" value={uniquePatients} color="#2d6a4f" bg="#d8f3dc" />
            <StatCard icon="✅" label="Completed Sessions" value={completed} color="#2d6a4f" bg="#d8f3dc" />
          </div>
          {loading ? <LoadingSpinner /> : null}
          {toast ? <div className="toast toast-success">{toast}</div> : null}
          {error ? <div className="toast toast-error">{error}</div> : null}
          <section className="card">
            <h2 className="card-title">Today's Schedule</h2>
            {!loading && todayAppointments.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📅</div><h3>No sessions today</h3><p>Your assigned sessions for today will appear here.</p></div>
            ) : (
              <div className="table-wrap">
                <table><thead><tr><th>Time</th><th>Patient</th><th>Therapy</th><th>Status</th><th>Update</th><th>Actions</th></tr></thead><tbody>{renderRows(todayAppointments)}</tbody></table>
              </div>
            )}
          </section>
          <section className="card">
            <h2 className="card-title">All Appointments</h2>
            <div className="table-wrap">
              <table><thead><tr><th>Date</th><th>Patient</th><th>Therapy</th><th>Time</th><th>Status</th><th>Update</th><th>Actions</th></tr></thead><tbody>{renderRows(appointments, true)}</tbody></table>
            </div>
          </section>
        </div>

        {editingAppointment && (
          <EditAppointmentModal
            appointment={editingAppointment}
            onClose={() => setEditingAppointment(null)}
            onSave={handleSaveEdit}
          />
        )}

        <Footer />
      </main>
    </div>
  )
}

export default TherapistDashboard
