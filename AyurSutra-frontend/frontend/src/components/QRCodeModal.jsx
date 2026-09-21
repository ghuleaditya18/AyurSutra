// Simple SVG visual QR pattern generator using mathematical hashing for robust demonstration
const QRCodeModal = ({ isOpen, onClose, appointment, patientId }) => {
  if (!isOpen || !appointment) return null

  const rawData = `AYRSUTRA-APPT-VERIFY\nAppointmentID: #${appointment.id}\nPatientID: ${patientId}\nTherapy: ${appointment.therapy_name || appointment.therapy?.name || 'Therapy'}\nDate: ${appointment.date}\nTime: ${appointment.start_time}`

  // Deterministic 15x15 visual grid generation based on appointment string
  const gridSize = 17
  const hash = (str) => {
    let h = 0
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
    }
    return Math.abs(h)
  }

  const baseHash = hash(rawData)
  const cells = []
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Standard QR position squares at corners
      const isCorner1 = r < 5 && c < 5
      const isCorner2 = r < 5 && c >= gridSize - 5
      const isCorner3 = r >= gridSize - 5 && c < 5
      let isDark

      if (isCorner1 || isCorner2 || isCorner3) {
        const localR = r < 5 ? r : r - (gridSize - 5)
        const localC = c < 5 ? c : c - (gridSize - 5)
        isDark = localR === 0 || localR === 4 || localC === 0 || localC === 4 || (localR === 2 && localC === 2)
      } else {
        const cellHash = (baseHash ^ (r * 37 + c * 17)) % 100
        isDark = cellHash < 48
      }
      if (isDark) {
        cells.push({ r, c })
      }
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          maxWidth: '380px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-primary, #1e4620)' }}>
          Clinical Check-in Pass
        </h3>
        <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 1rem 0' }}>
          Show this QR code at the clinic reception desk upon arrival.
        </p>

        <div
          style={{
            background: '#f8fafc',
            border: '2px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '1rem',
            display: 'inline-block',
            marginBottom: '1rem',
          }}
        >
          <svg
            width="170"
            height="170"
            viewBox={`0 0 ${gridSize} ${gridSize}`}
            style={{ display: 'block', margin: '0 auto' }}
          >
            <rect width={gridSize} height={gridSize} fill="#ffffff" />
            {cells.map((cell, idx) => (
              <rect
                key={idx}
                x={cell.c}
                y={cell.r}
                width="1"
                height="1"
                fill="#1e293b"
              />
            ))}
          </svg>
        </div>

        <div
          style={{
            textAlign: 'left',
            background: '#f1f5f9',
            borderRadius: '6px',
            padding: '0.75rem',
            fontSize: '0.8rem',
            color: '#334155',
            marginBottom: '1.25rem',
          }}
        >
          <p style={{ margin: '0 0 0.25rem 0' }}>
            <strong>Patient ID:</strong> {patientId}
          </p>
          <p style={{ margin: '0 0 0.25rem 0' }}>
            <strong>Therapy:</strong> {appointment.therapy_name || appointment.therapy?.name || 'Therapy'}
          </p>
          <p style={{ margin: '0 0 0.25rem 0' }}>
            <strong>Date & Time:</strong> {appointment.date} ({appointment.start_time} - {appointment.end_time})
          </p>
          <p style={{ margin: 0 }}>
            <strong>Status:</strong> {appointment.status?.toUpperCase()}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-full"
          onClick={onClose}
        >
          Close Pass
        </button>
      </div>
    </div>
  )
}

export default QRCodeModal
