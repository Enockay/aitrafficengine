import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import api from '@/lib/api'
import type { Page, PageCreateInput, PageListResponse } from '@/types/page'
import type { Post } from '@/types/post'
import type { GenerateVariantsResponse } from '@/types/variant'

export interface PagesFilters {
  page?: number
  limit?: number
  site_id?: string
  status?: string
  search?: string
}

export function usePagesQuery(filters: PagesFilters) {
  return useQuery({
    queryKey: ['pages', filters],
    queryFn: async () => {
      const { data } = await api.get<PageListResponse>('/pages', { params: filters })
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreatePage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PageCreateInput) => {
      const { data } = await api.post<Page>('/pages', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useDeletePage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/pages/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export interface GeneratePostInput {
  id: string
  platform?: string
  tone?: string
}

export function useGeneratePosts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, platform, tone }: GeneratePostInput) => {
      const { data } = await api.post<Post>(`/pages/${id}/generate`, {
        platform: platform ?? 'twitter',
        tone: tone || undefined,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['pages'] })
    },
  })
}

export interface GenerateVariantsInput {
  id: string
  platform?: string
  variant_count: number
}

export function useGenerateVariants() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, platform, variant_count }: GenerateVariantsInput) => {
      const { data } = await api.post<GenerateVariantsResponse>(`/pages/${id}/generate-variants`, {
        platform: platform ?? 'twitter',
        variant_count,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['pages'] })
    },
  })
}
