import { create } from 'zustand'
import { api } from '../services/api'

interface AuthState {
  token: string | null
  loading: boolean
  error: string | null
  login: (password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (password: string) => {
    set({ loading: true })
    try {
      const { token } = await api.login(password)
      localStorage.setItem('token', token)
      set({ token, loading: false })
    } catch {
      set({ error: '密码错误', loading: false })
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ token: null })
  },
}))
