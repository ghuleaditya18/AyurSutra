import api from './axios'

export const submitFeedback = (data) => api.post('/feedback/', data)

export const getAdminFeedback = () => api.get('/feedback/')

export const markFeedbackReviewed = (id) => api.patch(`/feedback/${id}/`, { reviewed: true })
