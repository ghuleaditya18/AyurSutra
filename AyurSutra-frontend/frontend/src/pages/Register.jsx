import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../api/auth'

import { formatApiError } from '../utils/formatError'

const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    address: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value })
    setErrors({ ...errors, [event.target.name]: '', form: '' })
  }

  const validate = () => {
    const nextErrors = {}
    if (!formData.name.trim()) nextErrors.name = 'Full name is required.'
    if (!formData.email.trim()) nextErrors.email = 'Email is required.'
    if (!formData.phone.trim()) nextErrors.phone = 'Phone is required.'
    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone.trim())) nextErrors.phone = 'Enter a valid 10-digit Indian phone number.'
    if (!formData.age) nextErrors.age = 'Age is required.'
    if (!formData.gender) nextErrors.gender = 'Gender is required.'
    if (!formData.password) nextErrors.password = 'Password is required.'
    if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = 'Passwords must match.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setToast('')
    if (!validate()) return
    setLoading(true)

    try {
      await registerUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        age: formData.age,
        gender: formData.gender,
        address: formData.address,
        password: formData.password,
      })
      setToast('Account created successfully.')
      setTimeout(() => navigate('/login'), 800)
    } catch (_error) {
      const fieldErrors = {}
      if (_error.response?.data && typeof _error.response.data === 'object') {
        for (const [key, val] of Object.entries(_error.response.data)) {
          if (Array.isArray(val)) fieldErrors[key] = val.join(' ')
        }
      }
      setErrors({
        ...fieldErrors,
        form: formatApiError(_error, 'Registration failed. Please check the details.'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <h1>AyurSutra</h1>
        <p>Create a secure patient account to book therapies and track your wellness progress.</p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <h2>Create account</h2>
          <p className="auth-subtitle">Patient registration takes less than a minute.</p>
          {toast && <div className="toast toast-success">{toast}</div>}
          {errors.form && <div className="toast toast-error">{errors.form}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full name</label>
              <input className="form-input" id="name" name="name" value={formData.name} onChange={handleChange} />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input className="form-input" id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone</label>
              <input className="form-input" id="phone" name="phone" value={formData.phone} onChange={handleChange} />
              {errors.phone && <span className="form-error">{errors.phone}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="age">Age</label>
              <input className="form-input" id="age" name="age" type="number" min="1" max="120" value={formData.age} onChange={handleChange} />
              {errors.age && <span className="form-error">{errors.age}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gender">Gender</label>
              <select className="form-input" id="gender" name="gender" value={formData.gender} onChange={handleChange}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <span className="form-error">{errors.gender}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="address">Address</label>
              <input className="form-input" id="address" name="address" value={formData.address} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input className="form-input" id="password" name="password" type="password" value={formData.password} onChange={handleChange} />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm password</label>
              <input className="form-input" id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} />
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
            </div>
            <button className="btn btn-primary btn-full" disabled={loading} type="submit">
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <p className="auth-link">
            Already registered? <Link to="/login">Login</Link>
          </p>
        </div>
      </section>
    </main>
  )
}

export default Register
