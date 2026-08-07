import { useQuery } from '@tanstack/react-query'

import api from '@/lib/api'

export interface AdminStats {
  total_users: number
  active_users: number
  users_by_plan: Record<string, number>
  mrr_estimate_usd: number
  total_revenue_by_currency: Record<string, number>
  total_sites: number
  total_posts: number
  pending_schedules_count: number
  recent_signups: { id: string; email: string; full_name: string; created_at: string }[]
}

export function useAdminStatsQuery() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<AdminStats>('/admin/stats')
      return data
    },
    staleTime: 30 * 1000,
  })
}
