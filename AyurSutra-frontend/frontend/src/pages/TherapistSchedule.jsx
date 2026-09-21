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

const getPatientName = (item) =>
  item.patient_name || item.patient?.name || item.name || item.patient?.email || 'Patient'

const getTherapyName = (item) =>
  item.therapy_name || item.therapy?.name || item.therapy || 'Therapy'

const TherapistSchedule = () => {
  const [appointments, setAppointments] = useState([])
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [editingAppointment, setEditingAppointment] = useState(null)

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await getMySchedules()
        setAppointments(Array.isArray(response.data) ? response.data : response.data.results || [])
      } catch {
        setError('Could not load your therapy schedule.')
      } finally {
        setLoading(false)
      }
    }

    fetchSchedule()
  }, [])

  const handleStatusChange = async (id, status) => {
    try {
      setError('')
      setToast('')
      await updateBookingStatus(id, status)
      setAppointments((items) =>
        items.map((item) => (item.id === id ? { ...item, status } : item))
      )
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

  // Summary counts
  const appliedCount = appointments.filter((item) => item.status === 'applied').length
  const todayCount = appointments.filter((item) => item.date === todayIso && item.status === 'scheduled').length
  const upcomingCount = appointments.filter((item) => item.date >= todayIso && item.status === 'scheduled').length
  const completedCount = appointments.filter((item) => item.status === 'completed').length

  const filteredAppointments = useMemo(() => {
    return appointments.filter((item) => {
      // Search match
      const query = search.toLowerCase().trim()
      const matchesSearch =
        !query ||
        getPatientName(item).toLowerCase().includes(query) ||
        getTherapyName(item).toLowerCase().includes(query)

      // Date match
      let matchesDate = true
      if (dateFilter === 'today') {
        matchesDate = item.date === todayIso
      } else if (dateFilter === 'upcoming') {
        matchesDate = item.date >= todayIso
      } else if (dateFilter === 'past') {
        matchesDate = item.date < todayIso
      }

      // Status match
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter

      return matchesSearch && matchesDate && matchesStatus
    })
  }, [appointments, search, dateFilter, statusFilter])

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <header className="topbar">
          <h1>My Schedule</h1>
          <StatusBadge status="therapist" />
        </header>

        <div className="page-body">
          <div className="stats-grid">
            <StatCard icon="⏳" label="Applied (Pending)" value={appliedCount} color="#d97706" bg="#fef3c7" />
            <StatCard icon="📅" label="Today's Scheduled" value={todayCount} color="#2563eb" bg="#dbeafe" />
            <StatCard icon="✓" label="Upcoming Scheduled" value={upcomingCount} color="#059669" bg="#d1fae5" />
            <StatCard icon="✅" label="Completed Sessions" value={completedCount} color="#2d6a4f" bg="#d8f3dc" />
          </div>

          <section className="card">
            <div className="filters">
              <input
                className="form-input"
                placeholder="Search by patient or therapy"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="form-input"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              >
                <option value="all">All Dates</option>
                <option value="today">Today Only</option>
                <option value="upcoming">Upcoming & Today</option>
                <option value="past">Past Sessions</option>
              </select>
              <select
                className="form-input"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="applied">Applied (Pending)</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {toast ? <div className="toast toast-success">{toast}</div> : null}
            {error ? <div className="toast toast-error">{error}</div> : null}
            {loading ? <LoadingSpinner /> : null}

            {!loading && filteredAppointments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h3>No sessions found</h3>
                <p>No appointments match the selected filters.</p>
              </div>
            ) : null}

            {!loading && filteredAppointments.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>Therapy</th>
                      <th>Status</th>
                      <th>Update Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.date}</strong>
                          {item.date === todayIso ? ' (Today)' : ''}
                        </td>
                        <td>
                          {item.start_time} - {item.end_time}
                        </td>
                        <td>{getPatientName(item)}</td>
                        <td>{getTherapyName(item)}</td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td>
                          <select
                            className="form-input status-select"
                            value={item.status || 'applied'}
                            onChange={(event) =>
                              handleStatusChange(item.id, event.target.value)
                            }
                          >
                            {item.status === 'applied' && (
                              <option value="applied">Applied (Pending)</option>
                            )}
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
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
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

export default TherapistSchedule
