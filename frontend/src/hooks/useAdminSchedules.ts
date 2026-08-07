import { useQuery } from '@tanstack/react-query'

import api from '@/lib/api'

export interface AdminSchedule {
  id: string
  post_id: string
  post_title: string | null
  platform: string
  owner_email: string
  scheduled_at: string
  status: string
  retry_count: number
  last_error: string | null
  published_at: string | null
}

export interface AdminScheduleListResponse {
  items: AdminSchedule[]
  total: number
}

export function useAdminSchedulesQuery(status?: string) {
  return useQuery({
    queryKey: ['admin', 'schedules', status],
    queryFn: async () => {
      const { data } = await api.get<AdminScheduleListResponse>('/admin/schedules', {
        params: status ? { status } : {},
      })
      return data
    },
  })
}
