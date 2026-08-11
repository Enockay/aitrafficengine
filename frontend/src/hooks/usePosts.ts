import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import api from '@/lib/api'
import type { Post, PostAnalytics, PostListResponse, PostUpdateInput } from '@/types/post'
import type { Schedule } from '@/types/schedule'
import type { GenerateVariantsResponse } from '@/types/variant'

export interface PostsFilters {
  page?: number
  limit?: number
  platform?: string
  status?: string
  search?: string
}

export function usePostsQuery(filters: PostsFilters) {
  return useQuery({
    queryKey: ['posts', filters],
    queryFn: async () => {
      const { data } = await api.get<PostListResponse>('/posts', { params: filters })
      return data
    },
    staleTime: 60 * 1000,
  })
}

export function usePostQuery(postId: string | null | undefined) {
  return useQuery({
    queryKey: ['posts', postId],
    queryFn: async () => {
      const { data } = await api.get<Post>(`/posts/${postId}`)
      return data
    },
    enabled: !!postId,
    staleTime: 15 * 1000,
  })
}

export function usePostAnalyticsQuery(postId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['posts', 'analytics', postId],
    queryFn: async () => {
      const { data } = await api.get<PostAnalytics>(`/posts/${postId}/analytics`)
      return data
    },
    enabled: enabled && !!postId,
    staleTime: 60 * 1000,
  })
}

export function useVariantGroupQuery(variantGroupId: string | null | undefined) {
  return useQuery({
    queryKey: ['posts', 'variants', variantGroupId],
    queryFn: async () => {
      const { data } = await api.get<GenerateVariantsResponse>(`/posts/variants/${variantGroupId}`)
      return data
    },
    enabled: !!variantGroupId,
    staleTime: 15 * 1000,
  })
}

export function useUpdatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: PostUpdateInput }) => {
      const { data } = await api.put<Post>(`/posts/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/posts/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['pages'] })
    },
  })
}

export function useApprovePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Post>(`/posts/${id}/approve`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

// Fixes a post whose body still carries a dev/local tracked link (generated while
// BACKEND_URL wasn't set to a public URL) by rewriting it to the server's current
// BACKEND_URL — the rest of the AI-drafted text is left untouched.
export function useRepairPostLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Post>(`/posts/${id}/repair-link`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export function useUploadPostMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post<Post>(`/posts/${id}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export function useDeletePostMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<Post>(`/posts/${id}/media`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export interface SchedulePostInput {
  id: string
  platform_account_id: string
  scheduled_at: string
  timezone?: string
}

export function useSchedulePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, platform_account_id, scheduled_at, timezone }: SchedulePostInput) => {
      const { data } = await api.post<Schedule>(`/posts/${id}/schedule`, {
        platform_account_id,
        scheduled_at,
        timezone: timezone ?? 'UTC',
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}

export interface PublishPostInput {
  id: string
  platform_account_id: string
}

export function usePublishPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, platform_account_id }: PublishPostInput) => {
      const { data } = await api.post<Post>(`/posts/${id}/publish`, { platform_account_id })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}
