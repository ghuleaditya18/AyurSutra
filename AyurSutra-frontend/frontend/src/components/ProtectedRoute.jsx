import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const dashboardByRole = {
  admin: '/admin/dashboard',
  therapist: '/therapist/dashboard',
  patient: '/dashboard',
}

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={dashboardByRole[user.role] || '/dashboard'} replace />
  }

  return children
}

export default ProtectedRoute
