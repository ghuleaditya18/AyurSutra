import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import NotificationDrawer from './NotificationDrawer'

const linksByRole = {
  patient: [
    { to: '/dashboard', label: 'Dashboard', icon: '⌂' },
    { to: '/therapies', label: 'Browse Therapies', icon: '✦' },
    { to: '/book', label: 'Book Therapy', icon: '+' },
    { to: '/feedback', label: 'Feedback', icon: '★' },
    { to: '/profile', label: 'My Profile', icon: '◉' },
  ],
  therapist: [
    { to: '/therapist/dashboard', label: 'Dashboard', icon: '⌂' },
    { to: '/therapist/patients', label: 'My Patients', icon: '☉' },
    { to: '/therapist/schedule', label: 'Schedule', icon: '□' },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: '⌂' },
    { to: '/admin/users', label: 'Users', icon: '☉' },
    { to: '/admin/bookings', label: 'Bookings', icon: '□' },
    { to: '/admin/feedback', label: 'Feedback', icon: '★' },
    { to: '/admin/create-staff', label: 'Create Staff', icon: '+' },
  ],
}

const getInitials = (user) => {
  const displayName = user?.name || user?.email || 'User'
  return displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const Sidebar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const links = linksByRole[user?.role] || linksByRole.patient

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>AyurSutra</h2>
        <p>Hospital Management</p>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className="sidebar-link">
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NotificationDrawer />
        <div className="sidebar-user" style={{ marginTop: '0.5rem' }}>
          <div className="avatar">{getInitials(user)}</div>
          <div>
            <p className="sidebar-name">{user?.name || user?.email || 'User'}</p>
            <p className="sidebar-role">{user?.role || 'patient'}</p>
          </div>
        </div>
        <button type="button" className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </aside>
  )
}

export default Sidebar

