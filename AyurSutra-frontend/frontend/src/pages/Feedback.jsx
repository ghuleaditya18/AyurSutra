import { useState } from 'react'
import { submitFeedback } from '../api/feedback'
import Footer from '../components/Footer'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/useAuth'
import { formatApiError } from '../utils/formatError'

const Feedback = () => {
  const { user } = useAuth()
  const [formData, setFormData] = useState(() => ({
    full_name: user?.name || '',
    contact: user?.phone || '',
    email: user?.email || '',
    service_taken: '',
    rating: '',
    symptoms: '',
    improvements: '',
    suggestions: '',
  }))
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value })
    setErrors({ ...errors, [event.target.name]: '', form: '' })
  }

  const validate = () => {
    const nextErrors = {}
    if (!formData.full_name.trim()) nextErrors.full_name = 'Full name is required.'
    if (!formData.rating) nextErrors.rating = 'Rating is required.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setToast('')
    if (!validate()) return
    setLoading(true)

    try {
      await submitFeedback(formData)
      setToast('Thank you. Your feedback has been submitted.')
      setFormData({
        full_name: user?.name || '',
        contact: user?.phone || '',
        email: user?.email || '',
        service_taken: '',
        rating: '',
        symptoms: '',
        improvements: '',
        suggestions: '',
      })
    } catch (_error) {
      setErrors({ form: formatApiError(_error, 'Could not submit feedback. Please check your inputs.') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <header className="topbar"><h1>Feedback</h1></header>
        <div className="page-body">
          <section className="card">
            <h2 className="card-title">Share your treatment experience</h2>
            {toast && <div className="toast toast-success">{toast}</div>}
            {errors.form && <div className="toast toast-error">{errors.form}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="full_name">Full name</label>
                  <input className="form-input" id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} />
                  {errors.full_name && <span className="form-error">{errors.full_name}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="contact">Contact</label>
                  <input className="form-input" id="contact" name="contact" value={formData.contact} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email</label>
                  <input className="form-input" id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="service_taken">Service taken</label>
                  <input className="form-input" id="service_taken" name="service_taken" value={formData.service_taken} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="rating">Rating</label>
                  <select className="form-input" id="rating" name="rating" value={formData.rating} onChange={handleChange}>
                    <option value="">Select rating</option>
                    {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} Stars</option>)}
                  </select>
                  {errors.rating && <span className="form-error">{errors.rating}</span>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="symptoms">Symptoms before treatment</label>
                <textarea className="form-input" id="symptoms" name="symptoms" rows="3" value={formData.symptoms} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="improvements">Improvements noticed</label>
                <textarea className="form-input" id="improvements" name="improvements" rows="3" value={formData.improvements} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="suggestions">Suggestions</label>
                <textarea className="form-input" id="suggestions" name="suggestions" rows="3" value={formData.suggestions} onChange={handleChange} />
              </div>
              <button className="btn btn-primary" disabled={loading} type="submit">{loading ? 'Submitting...' : 'Submit Feedback'}</button>
            </form>
          </section>
        </div>
        <Footer />
      </main>
    </div>
  )
}

export default Feedback
