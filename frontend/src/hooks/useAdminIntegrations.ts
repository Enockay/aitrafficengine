import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import api from '@/lib/api'

export interface PaystackConfigStatus {
  configured: boolean
  source: 'database' | 'environment' | 'none'
  secret_key_preview: string | null
  public_key: string | null
  updated_at: string | null
}

export interface BrevoConfigStatus {
  configured: boolean
  source: 'database' | 'environment' | 'none'
  api_key_preview: string | null
  sender_email: string | null
  sender_name: string | null
  updated_at: string | null
}

export function usePaystackConfigQuery() {
  return useQuery({
    queryKey: ['admin', 'config', 'paystack'],
    queryFn: async () => {
      const { data } = await api.get<PaystackConfigStatus>('/admin/config/paystack')
      return data
    },
  })
}

export function useSetPaystackConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ secret_key, public_key }: { secret_key: string; public_key: string }) => {
      const { data } = await api.put<PaystackConfigStatus>('/admin/config/paystack', { secret_key, public_key })
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'config', 'paystack'] }),
  })
}

export function useRemovePaystackConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<PaystackConfigStatus>('/admin/config/paystack')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'config', 'paystack'] }),
  })
}

export function useBrevoConfigQuery() {
  return useQuery({
    queryKey: ['admin', 'config', 'brevo'],
    queryFn: async () => {
      const { data } = await api.get<BrevoConfigStatus>('/admin/config/brevo')
      return data
    },
  })
}

export function useSetBrevoConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      api_key,
      sender_email,
      sender_name,
    }: {
      api_key: string
      sender_email: string
      sender_name: string
    }) => {
      const { data } = await api.put<BrevoConfigStatus>('/admin/config/brevo', {
        api_key,
        sender_email,
        sender_name,
      })
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'config', 'brevo'] }),
  })
}

export function useRemoveBrevoConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<BrevoConfigStatus>('/admin/config/brevo')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'config', 'brevo'] }),
  })
}

export interface GeoipConfigStatus {
  configured: boolean
  source: 'database' | 'environment' | 'none'
  filename: string | null
  size_bytes: number | null
  updated_at: string | null
}

export function useGeoipConfigQuery() {
  return useQuery({
    queryKey: ['admin', 'config', 'geoip'],
    queryFn: async () => {
      const { data } = await api.get<GeoipConfigStatus>('/admin/config/geoip')
      return data
    },
  })
}

export function useSetGeoipConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.put<GeoipConfigStatus>('/admin/config/geoip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'config', 'geoip'] }),
  })
}

export function useRemoveGeoipConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<GeoipConfigStatus>('/admin/config/geoip')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'config', 'geoip'] }),
  })
}
