import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import api from '@/lib/api'
import type { RescheduleInput, Schedule, ScheduleListResponse } from '@/types/schedule'

export function useSchedulesQuery(status?: string, enabled = true) {
  return useQuery({
    queryKey: ['schedules', status],
    queryFn: async () => {
      const { data } = await api.get<ScheduleListResponse>('/schedules', { params: { status } })
      return data
    },
    enabled,
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

export function useRescheduleSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: RescheduleInput & { id: string }) => {
      const { data } = await api.patch<Schedule>(`/schedules/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}
