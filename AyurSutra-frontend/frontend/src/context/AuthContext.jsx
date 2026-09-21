import { useState } from 'react'
import AuthContext from './AuthContext.js'

const STORAGE_KEY = 'ayur_user'

const normalizeUser = (userData, token) => {
  const resolvedToken = token || userData?.token || userData?.access || ''
  return {
    ...userData,
    id: userData?.id || '',
    name: userData?.name || userData?.full_name || userData?.email || 'User',
    email: userData?.email || '',
    role: userData?.role || 'patient',
    token: resolvedToken,
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    try {
      return JSON.parse(stored)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
  })

  const login = (userData, accessToken, refreshToken) => {
    const normalizedUser = normalizeUser(userData, accessToken)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUser))
    if (accessToken) localStorage.setItem('access_token', accessToken)
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
    setUser(normalizedUser)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
