import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllUsers, updateUser, deleteUser } from '../api/users'
import Footer from '../components/Footer'
import LoadingSpinner from '../components/LoadingSpinner'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/useAuth'
import { formatApiError } from '../utils/formatError'

const formatPatientId = (user) => user.patient_id || `AYR-${String(user.id || 0).padStart(5, '0')}`

const AdminUsers = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // Edit modal state
  const [editingUser, setEditingUser] = useState(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'patient',
    specialization: '',
    age: '',
    gender: 'Male',
    address: '',
  })
  const [editErrors, setEditErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Delete modal state
  const [deletingUser, setDeletingUser] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    getAllUsers()
      .then((data) => {
        if (active) {
          setUsers(Array.isArray(data) ? data : data.results || [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setError('Could not load users.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const query = search.toLowerCase()
      const matchesSearch =
        (u.name || u.full_name || u.email || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query) ||
        formatPatientId(u).toLowerCase().includes(query) ||
        (u.phone || '').includes(query)
      const matchesRole = role === 'all' || u.role === role
      return matchesSearch && matchesRole
    })
  }, [users, search, role])

  // Open edit modal
  const handleOpenEdit = (userToEdit) => {
    setEditingUser(userToEdit)
    setEditFormData({
      name: userToEdit.name || userToEdit.full_name || '',
      email: userToEdit.email || '',
      phone: userToEdit.phone || '',
      role: userToEdit.role || 'patient',
      specialization: userToEdit.specialization || '',
      age: userToEdit.age ?? '',
      gender: userToEdit.gender || 'Male',
      address: userToEdit.address || '',
    })
    setEditErrors({})
  }

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value })
    setEditErrors({ ...editErrors, [e.target.name]: '', form: '' })
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingUser) return

    setSaving(true)
    setEditErrors({})

    const payload = {
      name: editFormData.name,
      phone: editFormData.phone,
      role: editFormData.role,
      specialization: editFormData.role === 'therapist' ? editFormData.specialization : '',
      gender: editFormData.gender,
      address: editFormData.address,
    }

    if (editFormData.age !== '') {
      payload.age = Number(editFormData.age)
    }

    try {
      const updated = await updateUser(editingUser.id, payload)
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...updated.data } : u))
      )
      setToast(`User "${editFormData.name || editingUser.email}" updated successfully.`)
      setTimeout(() => setToast(''), 3500)
      setEditingUser(null)
    } catch (err) {
      setEditErrors({
        form: formatApiError(err, 'Failed to update user information.'),
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle delete
  const handleConfirmDelete = async () => {
    if (!deletingUser) return
    setDeleting(true)

    try {
      await deleteUser(deletingUser.id)
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id))
      setToast(`User "${deletingUser.name || deletingUser.email}" deleted successfully.`)
      setTimeout(() => setToast(''), 3500)
      setDeletingUser(null)
    } catch (err) {
      setError(formatApiError(err, 'Failed to delete user account.'))
      setDeletingUser(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <header className="topbar">
          <h1>Users & Staff Management</h1>
          <StatusBadge status="admin" />
        </header>

        <div className="page-body">
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div className="filters" style={{ margin: 0 }}>
                <input
                  className="form-input"
                  placeholder="Search by name, email, or ID"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select
                  className="form-input"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                >
                  <option value="all">All roles</option>
                  <option value="patient">Patients</option>
                  <option value="therapist">Therapists</option>
                  <option value="admin">Admins</option>
                </select>
              </div>

              <Link className="btn btn-primary btn-sm" to="/admin/create-staff">
                + Create Staff / User
              </Link>
            </div>

            {toast ? <div className="toast toast-success">{toast}</div> : null}
            {error ? <div className="toast toast-error">{error}</div> : null}
            {loading ? <LoadingSpinner /> : null}

            {!loading && filteredUsers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">☉</div>
                <h3>No users found</h3>
                <p>Try adjusting your search query or role filter.</p>
              </div>
            ) : null}

            {!loading && filteredUsers.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Patient/Staff ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Specialization</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>{formatPatientId(u)}</td>
                        <td>
                          <strong>{u.name || u.full_name || u.email}</strong>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.phone || '-'}</td>
                        <td>
                          <StatusBadge status={u.role} />
                        </td>
                        <td>{u.specialization || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => handleOpenEdit(u)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                              }}
                              onClick={() => setDeletingUser(u)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </div>

        {/* EDIT USER MODAL */}
        {editingUser && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '1rem',
            }}
            onClick={() => setEditingUser(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '1.5rem',
                maxWidth: '520px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="card-title" style={{ marginTop: 0, marginBottom: '1rem' }}>
                Edit User ({editingUser.email})
              </h2>

              {editErrors.form && (
                <div className="toast toast-error" style={{ marginBottom: '1rem' }}>
                  {editErrors.form}
                </div>
              )}

              <form onSubmit={handleSaveEdit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-name">Full Name</label>
                    <input
                      id="edit-name"
                      className="form-input"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-phone">Phone</label>
                    <input
                      id="edit-phone"
                      className="form-input"
                      name="phone"
                      value={editFormData.phone}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-role">Role</label>
                    <select
                      id="edit-role"
                      className="form-input"
                      name="role"
                      value={editFormData.role}
                      onChange={handleEditChange}
                    >
                      <option value="patient">Patient</option>
                      <option value="therapist">Therapist</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {editFormData.role === 'therapist' && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-specialization">Specialization</label>
                      <input
                        id="edit-specialization"
                        className="form-input"
                        name="specialization"
                        placeholder="e.g. Vamana, Basti, Shirodhara"
                        value={editFormData.specialization}
                        onChange={handleEditChange}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-age">Age</label>
                    <input
                      id="edit-age"
                      className="form-input"
                      name="age"
                      type="number"
                      min="1"
                      max="120"
                      value={editFormData.age}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-gender">Gender</label>
                    <select
                      id="edit-gender"
                      className="form-input"
                      name="gender"
                      value={editFormData.gender}
                      onChange={handleEditChange}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label" htmlFor="edit-address">Address</label>
                  <input
                    id="edit-address"
                    className="form-input"
                    name="address"
                    value={editFormData.address}
                    onChange={handleEditChange}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setEditingUser(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deletingUser && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '1rem',
            }}
            onClick={() => setDeletingUser(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '1.5rem',
                maxWidth: '420px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                textAlign: 'center',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#111827' }}>Delete User Account</h3>
              <p style={{ fontSize: '0.9rem', color: '#4b5563', margin: '0 0 1rem 0' }}>
                Are you sure you want to delete <strong>{deletingUser.name || deletingUser.email}</strong> (Role: {deletingUser.role})?
                This action is permanent and cannot be undone.
              </p>

              {currentUser && currentUser.id === deletingUser.id && (
                <div className="toast toast-error" style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
                  You cannot delete your own logged-in admin account.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setDeletingUser(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#dc2626', color: '#ffffff' }}
                  disabled={deleting || (currentUser && currentUser.id === deletingUser.id)}
                  onClick={handleConfirmDelete}
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </main>
    </div>
  )
}

export default AdminUsers
