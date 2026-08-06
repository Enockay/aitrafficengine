import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import api from '@/lib/api'
import type { ProfileUpdatePayload, RegisterPayload, User } from '@/types/user'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshTokenValue: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resendVerification: (email: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, newPassword: string) => Promise<void>
  updateProfile: (payload: ProfileUpdatePayload) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<string | null>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshTokenValue: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        set({
          user: data.user,
          accessToken: data.access_token,
          refreshTokenValue: data.refresh_token,
          isAuthenticated: true,
        })
      },

      // Registration no longer logs the user in — the account starts unverified and
      // login is blocked until they click the emailed verification link.
      register: async (payload) => {
        await api.post('/auth/register', {
          email: payload.email,
          password: payload.password,
          full_name: payload.full_name,
          company_name: payload.company_name || undefined,
          phone_country_code: payload.phone_country_code || undefined,
          phone_number: payload.phone_number || undefined,
          timezone: payload.timezone,
          referral_code: payload.referral_code || undefined,
        })
      },

      verifyEmail: async (token) => {
        const { data } = await api.post('/auth/verify-email', { token })
        set({
          user: data.user,
          accessToken: data.access_token,
          refreshTokenValue: data.refresh_token,
          isAuthenticated: true,
        })
      },

      resendVerification: async (email) => {
        await api.post('/auth/resend-verification', { email })
      },

      forgotPassword: async (email) => {
        await api.post('/auth/forgot-password', { email })
      },

      resetPassword: async (token, newPassword) => {
        await api.post('/auth/reset-password', { token, new_password: newPassword })
      },

      updateProfile: async (payload) => {
        const { data } = await api.put('/auth/me', payload)
        set({ user: data })
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } finally {
          set({ user: null, accessToken: null, refreshTokenValue: null, isAuthenticated: false })
        }
      },

      refreshAccessToken: async () => {
        const refreshTokenValue = get().refreshTokenValue
        if (!refreshTokenValue) return null
        try {
          const { data } = await api.post('/auth/refresh', { refresh_token: refreshTokenValue })
          set({ accessToken: data.access_token })
          return data.access_token as string
        } catch {
          set({ user: null, accessToken: null, refreshTokenValue: null, isAuthenticated: false })
          return null
        }
      },

      fetchMe: async () => {
        set({ isLoading: true })
        try {
          const { data } = await api.get('/auth/me')
          set({ user: data, isAuthenticated: true })
        } catch {
          const refreshed = await get().refreshAccessToken()
          if (refreshed) {
            try {
              const { data } = await api.get('/auth/me')
              set({ user: data, isAuthenticated: true })
            } catch {
              set({ user: null, isAuthenticated: false })
            }
          } else {
            set({ user: null, isAuthenticated: false })
          }
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ refreshTokenValue: state.refreshTokenValue }),
    }
  )
)
