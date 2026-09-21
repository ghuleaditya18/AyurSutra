const classMap = {
  applied: 'badge-applied',
  scheduled: 'badge-scheduled',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
  pending: 'badge-pending',
  patient: 'badge-patient',
  therapist: 'badge-therapist',
  admin: 'badge-admin',
}

const StatusBadge = ({ status }) => {
  const normalized = String(status || 'pending').toLowerCase()
  const className = classMap[normalized] || 'badge-pending'

  return <span className={`badge ${className}`}>{normalized}</span>
}

export default StatusBadge
