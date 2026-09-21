import api from './axios'

export const getTherapies = () => api.get('/therapies/')

export const getTherapists = () => api.get('/users/?role=therapist')
