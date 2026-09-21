import api from './axios'

export const registerUser = (data) => api.post('/register/', data)

export const loginUser = (data) => api.post('/token/', data)

export const getMyProfile = () => api.get('/users/profile/')
