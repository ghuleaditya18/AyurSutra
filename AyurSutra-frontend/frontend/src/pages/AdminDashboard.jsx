import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { getBookings } from '../api/bookings'
import Footer from '../components/Footer'
import LoadingSpinner from '../components/LoadingSpinner'
import Sidebar from '../components/Sidebar'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'

const quickLinks = [
  { to: '/admin/users', icon: '☉', title: 'Users', text: 'Manage patients, therapists, and admins.' },
  { to: '/admin/bookings', icon: '□', title: 'Bookings', text: 'Review and update therapy schedules.' },
  { to: '/admin/feedback', icon: '★', title: 'Feedback', text: 'Review patient feedback and ratings.' },
  { to: '/admin/create-staff', icon: '+', title: 'Create Staff', text: 'Add therapist or admin accounts.' },
]

const AdminDashboard = () => {
  const [stats, setStats] = useState({ total_users: 0, total_therapists: 0, total_bookings: 0, pending_feedback: 0 })
  const [recentBookings, setRecentBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [statsResponse, bookingsResponse] = await Promise.all([
          api.get('/admin/stats/'),
          getBookings(),
        ])
        setStats(statsResponse.data)
        setRecentBookings(Array.isArray(bookingsResponse.data) ? bookingsResponse.data : bookingsResponse.data.results || [])
      } catch {
        setError('Could not load admin dashboard.')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <header className="topbar"><h1>Admin Dashboard</h1><StatusBadge status="admin" /></header>
        <div className="page-body">
          <div className="stats-grid">
            <StatCard icon="☉" label="Total Users" value={stats.total_users || 0} color="#2d6a4f" bg="#d8f3dc" />
            <StatCard icon="🧑‍⚕️" label="Total Therapists" value={stats.total_therapists || 0} color="#2563eb" bg="#dbeafe" />
            <StatCard icon="📅" label="Total Bookings" value={stats.total_bookings || 0} color="#c9a84c" bg="#fdf3d7" />
            <StatCard icon="★" label="Pending Feedback" value={stats.pending_feedback || 0} color="#d97706" bg="#fef3c7" />
          </div>
          {error && <div className="toast toast-error">{error}</div>}
          <section className="quick-grid">
            {quickLinks.map((link) => (
              <Link className="quick-card" key={link.to} to={link.to}>
                <span>{link.icon}</span><h3>{link.title}</h3><p>{link.text}</p>
              </Link>
            ))}
          </section>
          <section className="card">
            <h2 className="card-title">Recent Bookings</h2>
            {loading ? <LoadingSpinner /> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Patient</th><th>Therapy</th><th>Therapist</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {recentBookings.map((item) => (
                      <tr key={item.id}>
                        <td>{item.patient_name || item.name || 'Patient'}</td>
                        <td>{item.therapy_name || item.therapy?.name || item.therapy}</td>
                        <td>{item.therapist_name || item.therapist?.name || 'Not assigned'}</td>
                        <td>{item.date}</td>
                        <td><StatusBadge status={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
        <Footer />
      </main>
    </div>
  )
}

export default AdminDashboard
