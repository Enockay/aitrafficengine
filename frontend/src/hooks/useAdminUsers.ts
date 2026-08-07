import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import api from '@/lib/api'

export interface AdminUser {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  company_name: string | null
  plan_code: string | null
  subscription_status: string | null
  sites_count: number
  posts_count: number
  created_at: string
}

export interface AdminActivityEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string
  details: Record<string, unknown> | null
  created_at: string
}

export interface AdminUserDetail extends AdminUser {
  trial_ends_at: string | null
  current_period_end: string | null
  recent_activity: AdminActivityEntry[]
}

export interface AdminUserListResponse {
  items: AdminUser[]
  total: number
  page: number
  limit: number
}

export interface AdminUsersFilters {
  page?: number
  limit?: number
  search?: string
  role?: string
  is_active?: boolean
  plan_code?: string
}

export function useAdminUsersQuery(filters: AdminUsersFilters) {
  return useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: async () => {
      const { data } = await api.get<AdminUserListResponse>('/admin/users', { params: filters })
      return data
    },
  })
}

export function useAdminUserDetailQuery(userId: string | null) {
  return useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: async () => {
      const { data } = await api.get<AdminUserDetail>(`/admin/users/${userId}`)
      return data
    },
    enabled: !!userId,
  })
}

function invalidateUsers(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
  queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
}

export function useSetUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data } = await api.patch<AdminUser>(`/admin/users/${id}/status`, { is_active })
      return data
    },
    onSuccess: () => invalidateUsers(queryClient),
  })
}

export function useSetUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { data } = await api.patch<AdminUser>(`/admin/users/${id}/role`, { role })
      return data
    },
    onSuccess: () => invalidateUsers(queryClient),
  })
}

export function useOverrideUserPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      plan_code,
      status,
      current_period_end,
    }: {
      id: string
      plan_code: string
      status?: string
      current_period_end?: string | null
    }) => {
      const { data } = await api.patch<AdminUser>(`/admin/users/${id}/plan`, {
        plan_code,
        status,
        current_period_end,
      })
      return data
    },
    onSuccess: () => invalidateUsers(queryClient),
  })
}

export function useSoftDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<AdminUser>(`/admin/users/${id}`)
      return data
    },
    onSuccess: () => invalidateUsers(queryClient),
  })
}
