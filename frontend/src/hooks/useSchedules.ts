import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import api from '@/lib/api'
import type { ScheduleListResponse } from '@/types/schedule'

export function useSchedulesQuery(status?: string) {
  return useQuery({
    queryKey: ['schedules', status],
    queryFn: async () => {
      const { data } = await api.get<ScheduleListResponse>('/schedules', { params: { status } })
      return data
    },
    staleTime: 15 * 1000,
  })
}

export function useCancelSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/schedules/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}
