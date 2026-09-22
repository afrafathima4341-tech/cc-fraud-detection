import { create } from 'zustand'
import api from '../services/api'

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const response = await api.post('/auth/login', { email, password })
      const { access_token, user } = response.data
      localStorage.setItem('token', access_token)
      set({ user, token: access_token, loading: false })
      return true
    } catch (error) {
      set({ error: error.response?.data?.message || 'Login failed', loading: false })
      return false
    }
  },

  register: async (email, username, password) => {
    set({ loading: true, error: null })
    try {
      const response = await api.post('/auth/register', { email, username, password })
      const { access_token, user } = response.data
      localStorage.setItem('token', access_token)
      set({ user, token: access_token, loading: false })
      return true
    } catch (error) {
      set({ error: error.response?.data?.message || 'Registration failed', loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ user: null, token: null })
      return
    }
    try {
      const response = await api.get('/auth/me')
      set({ user: response.data, token })
    } catch (error) {
      localStorage.removeItem('token')
      set({ user: null, token: null })
    }
  },
}))
