import { useEffect, useState } from 'react'
import { getAdminFeedback, markFeedbackReviewed } from '../api/feedback'
import Footer from '../components/Footer'
import LoadingSpinner from '../components/LoadingSpinner'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'

const truncate = (text) => {
  if (!text) return 'No comment'
  return text.length > 60 ? `${text.slice(0, 60)}...` : text
}

const AdminFeedback = () => {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const response = await getAdminFeedback()
        setFeedback(Array.isArray(response.data) ? response.data : response.data.results || [])
      } catch {
        setError('Could not load feedback.')
      } finally {
        setLoading(false)
      }
    }

    fetchFeedback()
  }, [])

  const handleReview = async (id) => {
    try {
      await markFeedbackReviewed(id)
      setFeedback((items) => items.map((item) => (item.id === id ? { ...item, reviewed: true } : item)))
    } catch {
      setError('Could not mark feedback as reviewed.')
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <header className="topbar"><h1>Feedback</h1><StatusBadge status="admin" /></header>
        <div className="page-body">
          <section className="card">
            {loading ? <LoadingSpinner /> : null}
            {error ? <div className="toast toast-error">{error}</div> : null}
            <div className="table-wrap">
              <table>
                <thead><tr><th>Patient</th><th>Therapy</th><th>Rating</th><th>Comment</th><th>Date Submitted</th><th>Action</th></tr></thead>
                <tbody>
                  {feedback.map((item) => (
                    <tr key={item.id}>
                      <td>{item.patient_name || item.full_name || 'Patient'}</td>
                      <td>{item.therapy_name || item.service_taken || 'Therapy'}</td>
                      <td><span className="stars">{'★'.repeat(Number(item.rating) || 0)}</span></td>
                      <td>{truncate(item.suggestions || item.improvements || item.symptoms)}</td>
                      <td>{item.created_at || item.date_submitted || 'Not available'}</td>
                      <td>
                        <button className="btn btn-sm btn-primary" disabled={item.reviewed} type="button" onClick={() => handleReview(item.id)}>
                          {item.reviewed ? 'Reviewed' : 'Mark Reviewed'}
                        </button>
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

export default AdminFeedback
