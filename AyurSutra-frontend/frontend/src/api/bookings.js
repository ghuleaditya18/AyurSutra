import api from './axios'

export const getBookings = (query = '') => api.get(`/schedules/${query}`)

export const getMySchedules = () => api.get('/schedules/')

export const getAvailableSlots = (params) => api.get('/schedules/available-slots/', { params })

export const createSchedule = (data) => api.post('/schedules/', data)

export const updateBookingStatus = (id, status) => api.patch(`/schedules/${id}/`, { status })

export const updateSchedule = (id, data) => api.patch(`/schedules/${id}/`, data)

export const deleteSchedule = (id) => api.delete(`/schedules/${id}/`)
