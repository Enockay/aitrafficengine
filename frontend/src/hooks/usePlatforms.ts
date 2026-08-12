import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import api from '@/lib/api'
import type { PlatformCredentialStatus, PlatformStatus } from '@/types/platform'

export function usePlatformsQuery() {
  return useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const { data } = await api.get<PlatformStatus[]>('/platforms')
      return data
    },
    staleTime: 30 * 1000,
  })
}

const SUPPORTED_PLATFORMS = ['twitter', 'linkedin', 'reddit', 'tumblr', 'pinterest']

export function usePlatformCredentials(enabled: boolean = true) {
  return useQuery({
    queryKey: ['platform-credentials'],
    queryFn: async () => {
      const results = await Promise.all(
        SUPPORTED_PLATFORMS.map((platform) =>
          api.get<PlatformCredentialStatus>(`/platforms/${platform}/credentials`).then((r) => r.data)
        )
      )
      return results
    },
    staleTime: 10 * 1000,
    enabled,
  })
}

export function useSetPlatformCredentials() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      platform,
      client_id,
      client_secret,
    }: {
      platform: string
      client_id: string
      client_secret: string
    }) => {
      const { data } = await api.put<PlatformCredentialStatus>(`/platforms/${platform}/credentials`, {
        client_id,
        client_secret,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-credentials'] })
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
    },
  })
}

export function useSetPlatformEnabled() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ platform, is_enabled }: { platform: string; is_enabled: boolean }) => {
      const { data } = await api.patch<PlatformCredentialStatus>(`/platforms/${platform}/enabled`, { is_enabled })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-credentials'] })
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
    },
  })
}

export function useSetPlatformScopes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ platform, scopes }: { platform: string; scopes: string }) => {
      const { data } = await api.patch<PlatformCredentialStatus>(`/platforms/${platform}/scopes`, { scopes })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-credentials'] })
    },
  })
}

export function useRemovePlatformCredentials() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (platform: string) => {
      const { data } = await api.delete<PlatformCredentialStatus>(`/platforms/${platform}/credentials`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-credentials'] })
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
    },
  })
}

export function useConnectPlatform() {
  return useMutation({
    mutationFn: async (platform: string) => {
      const { data } = await api.get<{ authorize_url: string }>(`/platforms/${platform}/connect`)
      return data
    },
  })
}

export function useDisconnectPlatform() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (accountId: string) => {
      await api.delete(`/platforms/${accountId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
    },
  })
}
