import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getMyProfile, loginUser } from '../api/auth'
import { useAuth } from '../context/useAuth'

const roles = ['patient', 'therapist', 'admin']
const roleLabels = { patient: 'Patient', therapist: 'Therapist', admin: 'Admin' }
const dashboardByRole = { patient: '/dashboard', therapist: '/therapist/dashboard', admin: '/admin/dashboard' }

const Login = () => {
  const { role } = useParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [selectedRole, setSelectedRole] = useState(roles.includes(role) ? role : 'patient')
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    // Clear stale session tokens before authenticating
    localStorage.removeItem('ayur_user')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')

    try {
      const response = await loginUser(formData)
      const token = response.data.access || response.data.token
      let userData = response.data.user

      if (!userData && token) {
        localStorage.setItem('access_token', token)
        const profile = await getMyProfile()
        userData = Array.isArray(profile.data) ? profile.data[0] : profile.data
      }

      if (!userData || userData.role !== selectedRole) {
        setError(`This account is not registered as ${roleLabels[selectedRole]}.`)
        return
      }

      login(userData, token, response.data.refresh)
      navigate(dashboardByRole[userData.role], { replace: true })
    } catch (_error) {
      setError(_error.response?.data?.detail || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <h1>AyurSutra</h1>
        <p>Secure patient care, therapy scheduling, and clinical operations for Ayurveda wellness teams.</p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p className="auth-subtitle">Sign in to continue to your dashboard.</p>

          <div className="role-tabs">
            {roles.map((item) => (
              <button
                className={`role-tab ${selectedRole === item ? 'active' : ''}`}
                key={item}
                onClick={() => setSelectedRole(item)}
                type="button"
              >
                {roleLabels[item]}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input className="form-input" id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input className="form-input" id="password" name="password" type="password" value={formData.password} onChange={handleChange} required />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary btn-full" disabled={loading} type="submit">
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <p className="auth-link">
            New patient? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </section>
    </main>
  )
}

export default Login
