import { useQuery } from '@tanstack/react-query'

import api from '@/lib/api'
import type { ActivityLogListResponse } from '@/types/activityLog'

export interface ActivityLogFilters {
  page?: number
  limit?: number
  entity_type?: string
  action?: string
}

export function useActivityLogs(filters: ActivityLogFilters) {
  return useQuery({
    queryKey: ['activity-logs', filters],
    queryFn: async () => {
      const { data } = await api.get<ActivityLogListResponse>('/activity-logs', { params: filters })
      return data
    },
    staleTime: 15 * 1000,
  })
}
