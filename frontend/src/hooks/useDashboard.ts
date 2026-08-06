import { useQuery } from '@tanstack/react-query'

import api from '@/lib/api'
import type { DashboardOverview } from '@/types/dashboard'

export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      const { data } = await api.get<DashboardOverview>('/dashboard/overview')
      return data
    },
    staleTime: 30 * 1000,
  })
}
