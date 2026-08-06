import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import api from '@/lib/api'
import type { TrendFetchLog, TrendFetchLogListResponse, TrendListResponse } from '@/types/trend'

export function useTrendFetchLogs() {
  return useQuery({
    queryKey: ['trends', 'fetch-logs'],
    queryFn: async () => {
      const { data } = await api.get<TrendFetchLogListResponse>('/trends/fetch-logs', {
        params: { limit: 20 },
      })
      return data
    },
    staleTime: 30 * 1000,
  })
}

export function useAvailableTrends() {
  return useQuery({
    queryKey: ['trends', 'list'],
    queryFn: async () => {
      const { data } = await api.get<TrendListResponse>('/trends', { params: { limit: 50 } })
      return data
    },
    staleTime: 30 * 1000,
  })
}

export function useFetchTrendsNow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<TrendFetchLog>('/trends/fetch-now')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trends'] })
    },
  })
}
