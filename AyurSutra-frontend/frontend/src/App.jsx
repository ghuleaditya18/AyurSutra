import { Navigate, Route, Routes } from 'react-router-dom'
import AdminBookings from './pages/AdminBookings'
import AdminCreateStaff from './pages/AdminCreateStaff'
import AdminDashboard from './pages/AdminDashboard'
import AdminFeedback from './pages/AdminFeedback'
import AdminUsers from './pages/AdminUsers'
import BookTherapy from './pages/BookTherapy'
import Feedback from './pages/Feedback'
import Landing from './pages/Landing'
import Login from './pages/Login'
import PatientDashboard from './pages/PatientDashboard'
import Profile from './pages/Profile'
import ProtectedRoute from './components/ProtectedRoute'
import Register from './pages/Register'
import Therapies from './pages/Therapies'
import TherapistDashboard from './pages/TherapistDashboard'
import TherapistPatients from './pages/TherapistPatients'
import TherapistSchedule from './pages/TherapistSchedule'

const protect = (allowedRole, component) => (
  <ProtectedRoute allowedRole={allowedRole}>{component}</ProtectedRoute>
)

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login/:role" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/dashboard" element={protect('patient', <PatientDashboard />)} />
      <Route path="/therapies" element={protect('patient', <Therapies />)} />
      <Route path="/book" element={protect('patient', <BookTherapy />)} />
      <Route path="/feedback" element={protect('patient', <Feedback />)} />
      <Route path="/profile" element={protect('patient', <Profile />)} />

      <Route path="/therapist/dashboard" element={protect('therapist', <TherapistDashboard />)} />
      <Route path="/therapist/patients" element={protect('therapist', <TherapistPatients />)} />
      <Route path="/therapist/schedule" element={protect('therapist', <TherapistSchedule />)} />

      <Route path="/admin/dashboard" element={protect('admin', <AdminDashboard />)} />
      <Route path="/admin/users" element={protect('admin', <AdminUsers />)} />
      <Route path="/admin/bookings" element={protect('admin', <AdminBookings />)} />
      <Route path="/admin/feedback" element={protect('admin', <AdminFeedback />)} />
      <Route path="/admin/create-staff" element={protect('admin', <AdminCreateStaff />)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
