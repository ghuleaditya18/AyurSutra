import { useState, useEffect, useCallback } from 'react'
import { getNotifications, markNotificationRead } from '../api/users'

const NotificationDrawer = () => {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchNotifs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getNotifications()
      setNotifications(Array.isArray(res.data) ? res.data : res.data.results || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    getNotifications()
      .then((res) => {
        if (active) {
          setNotifications(Array.isArray(res.data) ? res.data : res.data.results || [])
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    } catch {
      // ignore
    }
  }

  return (
    <div className="notif-wrapper" style={{ position: 'relative', width: '100%', marginTop: '0.5rem' }}>
      <button
        type="button"
        className="sidebar-link"
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: open ? 'var(--color-primary-light, #edf7ed)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0.5rem 0.75rem',
          borderRadius: '6px',
        }}
        onClick={() => {
          setOpen(!open)
          if (!open) fetchNotifs()
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔔</span> Notifications
        </span>
        {unreadCount > 0 && (
          <span
            style={{
              background: '#dc2626',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            width: '260px',
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            zIndex: 50,
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '0.75rem',
            marginBottom: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.25rem' }}>
            <strong style={{ fontSize: '0.85rem' }}>Notifications</strong>
            <button
              type="button"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280' }}
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          {loading && <p style={{ fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>Loading...</p>}

          {!loading && notifications.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: '#6b7280', textAlign: 'center', padding: '0.5rem 0' }}>
              No notifications yet.
            </p>
          )}

          {!loading && notifications.map((notif) => (
            <div
              key={notif.id}
              style={{
                padding: '0.4rem 0.5rem',
                borderRadius: '4px',
                marginBottom: '0.35rem',
                background: notif.read ? '#f9fafb' : '#eff6ff',
                borderLeft: notif.read ? '3px solid #d1d5db' : '3px solid #2563eb',
                fontSize: '0.78rem',
              }}
            >
              <p style={{ margin: 0, color: '#1f2937' }}>{notif.message}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                  {notif.date ? notif.date.slice(0, 10) : ''}
                </span>
                {!notif.read && (
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      padding: 0,
                    }}
                    onClick={() => handleMarkRead(notif.id)}
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default NotificationDrawer
