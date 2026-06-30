import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../api/auth'
import type { User } from '../types'

interface AuthState {
  accessToken: string | null
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
  googleLogin: (token: string) => Promise<void>
  appleLogin: (token: string) => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      isLoading: true,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await authApi.login(email, password)
        localStorage.setItem('token', data.access_token)
        set({ accessToken: data.access_token, isAuthenticated: true })
        await get().fetchMe()
      },

      register: async (email, username, password) => {
        const { data } = await authApi.register(email, username, password)
        localStorage.setItem('token', data.access_token)
        set({ accessToken: data.access_token, isAuthenticated: true })
        await get().fetchMe()
      },

      logout: () => {
        localStorage.removeItem('token')
        set({ accessToken: null, user: null, isAuthenticated: false })
      },

      googleLogin: async (token) => {
        const { data } = await authApi.googleLogin(token)
        localStorage.setItem('token', data.access_token)
        set({ accessToken: data.access_token, isAuthenticated: true })
        await get().fetchMe()
      },

      appleLogin: async (token) => {
        const { data } = await authApi.appleLogin(token)
        localStorage.setItem('token', data.access_token)
        set({ accessToken: data.access_token, isAuthenticated: true })
        await get().fetchMe()
      },

      fetchMe: async () => {
        const token = localStorage.getItem('token')
        if (!token) {
          set({ isLoading: false, isAuthenticated: false })
          return
        }
        try {
          const { data } = await authApi.getMe()
          set({ user: data, isLoading: false, isAuthenticated: true })
        } catch {
          localStorage.removeItem('token')
          set({ accessToken: null, user: null, isLoading: false, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ accessToken: state.accessToken }),
    }
  )
)

useAuth.getState().fetchMe()
