import { useEffect, useState } from 'react'
import { getUserProfile, updateProfile } from '../api/users'
import Footer from '../components/Footer'
import LoadingSpinner from '../components/LoadingSpinner'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/useAuth'

const Profile = () => {
  const { user, login } = useAuth()
  const [profile, setProfile] = useState(user || {})
  const [formData, setFormData] = useState({ name: user?.name || '', phone: user?.phone || '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getUserProfile()
        const data = Array.isArray(response.data) ? response.data[0] : response.data
        setProfile(data)
        setFormData({ name: data.name || data.full_name || data.email || '', phone: data.phone || '' })
      } catch {
        setError('Could not load profile.')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setToast('')
    setSaving(true)

    try {
      const response = await updateProfile(formData)
      const updated = { ...profile, ...response.data, ...formData }
      setProfile(updated)
      login(updated, user?.token)
      setToast('Profile saved successfully.')
    } catch {
      setError('Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  const patientId = profile.patient_id || `AYR-${String(profile.id || user?.id || 0).padStart(5, '0')}`

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <header className="topbar"><h1>My Profile</h1></header>
        <div className="page-body">
          {loading ? <LoadingSpinner /> : (
            <>
              {toast && <div className="toast toast-success">{toast}</div>}
              {error && <div className="toast toast-error">{error}</div>}
              <section className="card">
                <h2 className="card-title">Profile details</h2>
                <div className="profile-grid">
                  <div className="profile-item"><span>Patient ID</span><strong>{patientId}</strong></div>
                  <div className="profile-item"><span>Name</span><strong>{profile.name || formData.name}</strong></div>
                  <div className="profile-item"><span>Email</span><strong>{profile.email}</strong></div>
                  <div className="profile-item"><span>Role</span><strong><StatusBadge status={profile.role || user?.role} /></strong></div>
                  <div className="profile-item"><span>Date joined</span><strong>{profile.date_joined || 'Not available'}</strong></div>
                </div>
              </section>
              <section className="card">
                <h2 className="card-title">Edit profile</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="name">Name</label>
                      <input className="form-input" id="name" name="name" value={formData.name} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="phone">Phone number</label>
                      <input className="form-input" id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                    </div>
                  </div>
                  <button className="btn btn-primary" disabled={saving} type="submit">{saving ? 'Saving...' : 'Save Profile'}</button>
                </form>
              </section>
            </>
          )}
        </div>
        <Footer />
      </main>
    </div>
  )
}

export default Profile
