import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import api from '@/lib/api'

export interface AdminPlan {
  code: string
  name: string
  price_usd: number
  max_sites: number
  max_posts_per_month: number
  max_flyers_per_month: number
  schedule_horizon_days: number
  paystack_plan_code: string
}

export type AdminPlanInput = AdminPlan
export type AdminPlanUpdateInput = Omit<AdminPlan, 'code'>

const QUERY_KEY = ['admin', 'plans']

export function useAdminPlansQuery() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get<AdminPlan[]>('/admin/plans')
      return data
    },
  })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AdminPlanInput) => {
      const { data } = await api.post<AdminPlan>('/admin/plans', input)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ code, input }: { code: string; input: AdminPlanUpdateInput }) => {
      const { data } = await api.put<AdminPlan>(`/admin/plans/${code}`, input)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeletePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      await api.delete(`/admin/plans/${code}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
