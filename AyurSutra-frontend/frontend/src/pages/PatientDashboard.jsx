import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMySchedules } from '../api/bookings'
import Footer from '../components/Footer'
import LoadingSpinner from '../components/LoadingSpinner'
import Sidebar from '../components/Sidebar'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/useAuth'

import QRCodeModal from '../components/QRCodeModal'

const getPatientId = (user) => user?.patient_id || `AYR-${String(user?.id || 0).padStart(5, '0')}`

const PatientDashboard = () => {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [selectedApptForQr, setSelectedApptForQr] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await getMySchedules()
        setAppointments(Array.isArray(response.data) ? response.data : response.data.results || [])
      } catch {
        setError('Could not load appointments.')
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [])

  const applied = appointments.filter((item) => item.status === 'applied').length
  const upcoming = appointments.filter((item) => item.status === 'scheduled').length
  const completed = appointments.filter((item) => item.status === 'completed').length

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <header className="topbar">
          <h1>Patient Dashboard</h1>
          <StatusBadge status={user?.role} />
        </header>

        <div className="page-body">
          <div className="stats-grid">
            <StatCard icon="⏳" label="Applied" value={applied} color="#d97706" bg="#fef3c7" />
            <StatCard icon="📅" label="Confirmed" value={upcoming} color="#2563eb" bg="#dbeafe" />
            <StatCard icon="✅" label="Completed Sessions" value={completed} color="#2d6a4f" bg="#d8f3dc" />
            <StatCard icon="✦" label="Total Requests" value={appointments.length} color="#c9a84c" bg="#fdf3d7" />
          </div>

          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Patient Profile</h2>
            </div>
            <div className="profile-grid">
              <div className="profile-item"><span>Patient ID</span><strong>{getPatientId(user)}</strong></div>
              <div className="profile-item"><span>Name</span><strong>{user?.name || 'Patient'}</strong></div>
              <div className="profile-item"><span>Email</span><strong>{user?.email}</strong></div>
              <div className="profile-item"><span>Role</span><strong><StatusBadge status={user?.role} /></strong></div>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Appointments</h2>
              <Link className="btn btn-primary btn-sm" to="/book">Book Therapy</Link>
            </div>
            {loading ? <LoadingSpinner /> : null}
            {error ? <div className="toast toast-error">{error}</div> : null}
            {!loading && !error && appointments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h3>No appointments yet</h3>
                <p>Book your first therapy session to begin tracking your care.</p>
                <Link className="btn btn-primary" to="/book">Book Therapy</Link>
              </div>
            ) : null}
            {!loading && appointments.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Therapy</th>
                      <th>Therapist</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Pass</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((item, index) => (
                      <tr key={item.id || index}>
                        <td>{index + 1}</td>
                        <td>{item.therapy_name || item.therapy?.name || item.therapy}</td>
                        <td>{item.therapist_name || item.therapist?.name || 'Not assigned'}</td>
                        <td>{item.date}</td>
                        <td>{item.start_time} - {item.end_time}</td>
                        <td><StatusBadge status={item.status} /></td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setSelectedApptForQr(item)}
                          >
                            QR Pass
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </div>

        <QRCodeModal
          isOpen={!!selectedApptForQr}
          onClose={() => setSelectedApptForQr(null)}
          appointment={selectedApptForQr}
          patientId={getPatientId(user)}
        />
        <Footer />
      </main>
    </div>
  )
}

export default PatientDashboard
