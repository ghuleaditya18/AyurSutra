import { useEffect, useMemo, useState } from 'react'
import { getMySchedules } from '../api/bookings'
import Footer from '../components/Footer'
import LoadingSpinner from '../components/LoadingSpinner'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'

const getPatientName = (item) =>
  item.patient_name || item.patient?.name || item.name || item.patient?.email || 'Patient'

const getPatientEmail = (item) =>
  item.email || item.patient?.email || 'No email'

const getPatientId = (item) =>
  item.patient?.patient_id || item.patient_id || (item.patient ? `AYR-${String(item.patient).padStart(5, '0')}` : 'AYR-00000')

const TherapistPatients = () => {
  const [schedules, setSchedules] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const response = await getMySchedules()
        setSchedules(Array.isArray(response.data) ? response.data : response.data.results || [])
      } catch {
        setError('Could not load patient records.')
      } finally {
        setLoading(false)
      }
    }

    fetchPatientData()
  }, [])

  // Aggregate unique patients from therapist's schedules
  const patientsList = useMemo(() => {
    const map = new Map()

    for (const item of schedules) {
      const key = item.patient || item.patient_id || item.email || item.name
      if (!key) continue

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          patientId: getPatientId(item),
          name: getPatientName(item),
          email: getPatientEmail(item),
          totalSessions: 1,
          lastTherapy: item.therapy_name || item.therapy?.name || 'Therapy',
          lastDate: item.date,
          latestStatus: item.status,
        })
      } else {
        const existing = map.get(key)
        existing.totalSessions += 1
        if (item.date >= existing.lastDate) {
          existing.lastDate = item.date
          existing.lastTherapy = item.therapy_name || item.therapy?.name || existing.lastTherapy
          existing.latestStatus = item.status
        }
      }
    }

    return Array.from(map.values())
  }, [schedules])

  const filteredPatients = useMemo(() => {
    const query = search.toLowerCase().trim()
    if (!query) return patientsList

    return patientsList.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.patientId.toLowerCase().includes(query)
    )
  }, [patientsList, search])

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <header className="topbar">
          <h1>My Patients</h1>
          <StatusBadge status="therapist" />
        </header>

        <div className="page-body">
          <section className="card">
            <div className="filters">
              <input
                className="form-input"
                placeholder="Search by patient name, ID, or email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {loading ? <LoadingSpinner /> : null}
            {error ? <div className="toast toast-error">{error}</div> : null}

            {!loading && filteredPatients.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">☉</div>
                <h3>No patients found</h3>
                <p>
                  {search
                    ? 'No patients match your search criteria.'
                    : 'Patients assigned to your sessions will appear here.'}
                </p>
              </div>
            ) : null}

            {!loading && filteredPatients.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Patient ID</th>
                      <th>Patient Name</th>
                      <th>Email</th>
                      <th>Total Sessions</th>
                      <th>Last Therapy</th>
                      <th>Last Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((patient) => (
                      <tr key={patient.id}>
                        <td>{patient.patientId}</td>
                        <td>
                          <strong>{patient.name}</strong>
                        </td>
                        <td>{patient.email}</td>
                        <td>{patient.totalSessions}</td>
                        <td>{patient.lastTherapy}</td>
                        <td>{patient.lastDate}</td>
                        <td>
                          <StatusBadge status={patient.latestStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </div>
        <Footer />
      </main>
    </div>
  )
}

export default TherapistPatients
