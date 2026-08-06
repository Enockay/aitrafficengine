import { useQuery } from '@tanstack/react-query'

import api from '@/lib/api'
import type { OptimalTimesResponse } from '@/types/optimal-time'

export function useOptimalTimesQuery(platform: string | undefined) {
  return useQuery({
    queryKey: ['optimal-times', platform],
    queryFn: async () => {
      const { data } = await api.get<OptimalTimesResponse>(`/optimal-times/${platform}`)
      return data
    },
    enabled: !!platform,
    staleTime: 5 * 60 * 1000,
  })
}
