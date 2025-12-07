import axios from 'axios'

// Configure axios instance with interceptors for logging
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  timeout: 30000,
})

// Request interceptor - log outgoing requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      console.log(`🚀 [Frontend] ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        headers: config.headers,
      })
    }
    return config
  },
  (error) => {
    console.error('❌ [Frontend] Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor - log responses
api.interceptors.response.use(
  (response) => {
    if (typeof window !== 'undefined') {
      console.log(`✅ [Frontend] ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`, {
        data: response.data,
      })
    }
    return response
  },
  (error) => {
    if (typeof window !== 'undefined') {
      console.error(`❌ [Frontend] ${error.config?.method?.toUpperCase()} ${error.config?.url} - Error:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      })
    }
    return Promise.reject(error)
  }
)

export default api

