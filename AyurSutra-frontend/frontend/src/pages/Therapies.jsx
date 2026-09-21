import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTherapies } from '../api/therapies'
import Footer from '../components/Footer'
import LoadingSpinner from '../components/LoadingSpinner'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'

const Therapies = () => {
  const [therapies, setTherapies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTherapies = async () => {
      try {
        const response = await getTherapies()
        setTherapies(Array.isArray(response.data) ? response.data : response.data.results || [])
      } catch {
        setError('Could not load therapies.')
      } finally {
        setLoading(false)
      }
    }

    fetchTherapies()
  }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <header className="topbar">
          <h1>Browse Therapies</h1>
          <StatusBadge status="patient" />
        </header>
        <div className="page-body">
          {loading ? <LoadingSpinner /> : null}
          {error ? <div className="toast toast-error">{error}</div> : null}
          {!loading && therapies.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✦</div>
              <h3>No therapies available</h3>
              <p>Please check again after the admin adds therapy records.</p>
            </div>
          ) : null}
          <div className="therapy-grid">
            {therapies.map((therapy) => (
              <article className="therapy-card" key={therapy.id}>
                <span>✦</span>
                <h3>{therapy.name}</h3>
                <p>{therapy.description || 'Structured Ayurvedic therapy managed by expert staff.'}</p>
                <p><strong>{therapy.duration} mins</strong> · <strong>₹{therapy.price}</strong></p>
                <Link className="btn btn-primary btn-sm" to="/book">Book Therapy</Link>
              </article>
            ))}
          </div>
        </div>
        <Footer />
      </main>
    </div>
  )
}

export default Therapies
