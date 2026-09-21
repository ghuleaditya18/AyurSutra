const StatCard = ({ icon, label, value, color, bg }) => {
  return (
    <article className="stat-card">
      <div className="stat-icon" style={{ color, backgroundColor: bg }}>
        {icon}
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </article>
  )
}

export default StatCard
