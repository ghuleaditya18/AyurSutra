import { useEffect, useMemo, useState } from 'react'
import { getBookings, updateBookingStatus } from '../api/bookings'
import Footer from '../components/Footer'
import LoadingSpinner from '../components/LoadingSpinner'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'

const AdminBookings = () => {
  const [bookings, setBookings] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await getBookings()
        setBookings(Array.isArray(response.data) ? response.data : response.data.results || [])
      } catch {
        setError('Could not load bookings.')
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [])

  const filteredBookings = useMemo(() => bookings.filter((booking) => {
    const patientName = (booking.patient_name || booking.name || '').toLowerCase()
    const matchesSearch = patientName.includes(search.toLowerCase())
    const matchesStatus = status === 'all' || booking.status === status
    return matchesSearch && matchesStatus
  }), [bookings, search, status])

  const handleStatusChange = async (id, nextStatus) => {
    try {
      await updateBookingStatus(id, nextStatus)
      setBookings((items) => items.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)))
    } catch {
      setError('Could not update booking status.')
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <header className="topbar"><h1>Bookings</h1><StatusBadge status="admin" /></header>
        <div className="page-body">
          <section className="card">
            <div className="filters">
              <input className="form-input" placeholder="Search by patient name" value={search} onChange={(event) => setSearch(event.target.value)} />
              <select className="form-input" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="applied">Applied (Pending)</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {loading ? <LoadingSpinner /> : null}
            {error ? <div className="toast toast-error">{error}</div> : null}
            <div className="table-wrap">
              <table>
                <thead><tr><th>Booking ID</th><th>Patient</th><th>Therapy</th><th>Therapist</th><th>Date</th><th>Time</th><th>Status</th><th>Change Status</th></tr></thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>#{booking.id}</td>
                      <td>{booking.patient_name || booking.name || 'Patient'}</td>
                      <td>{booking.therapy_name || booking.therapy?.name || booking.therapy}</td>
                      <td>{booking.therapist_name || booking.therapist?.name || 'Not assigned'}</td>
                      <td>{booking.date}</td>
                      <td>{booking.start_time} - {booking.end_time}</td>
                      <td><StatusBadge status={booking.status} /></td>
                      <td>
                        <select className="form-input status-select" value={booking.status || 'applied'} onChange={(event) => handleStatusChange(booking.id, event.target.value)}>
                          <option value="applied">Applied</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <Footer />
      </main>
    </div>
  )
}

export default AdminBookings
