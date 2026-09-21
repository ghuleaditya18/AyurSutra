import api from './axios'

export const getAllUsers = (query = '') => api.get(`/users/${query}`).then((res) => res.data)

export const getUserProfile = () => api.get('/users/profile/')

export const updateProfile = (data) => api.patch('/users/profile/', data)

export const updateUser = (id, data) => api.patch(`/users/${id}/`, data)

export const deleteUser = (id) => api.delete(`/users/${id}/`)

export const createStaff = (data) => api.post('/staff/create/', data)

export const getNotifications = () => api.get('/notifications/')

export const markNotificationRead = (id) => api.patch(`/notifications/${id}/`, { read: true })

export const getMessages = () => api.get('/messages/')

export const sendMessage = (data) => api.post('/messages/', data)
