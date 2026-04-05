import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: BASE, timeout: 30000 })

export const getAnalysis = (sessionId) =>
  api.get(`/v1/suggestions/${sessionId}`).then(r => r.data)

export const triggerAnalyze = (sessionId) =>
  api.post('/v1/analyze', { sessionId }).then(r => r.data)

export const generateFix = (sessionId, componentName, issue) =>
  api.post('/v1/fix', { sessionId, componentName, issue }).then(r => r.data)

export const compareSessions = (before, after) =>
  api.get(`/v1/compare?before=${before}&after=${after}`).then(r => r.data)

export const healthCheck = () =>
  api.get('/v1/health').then(r => r.data)
