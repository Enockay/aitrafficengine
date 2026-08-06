import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import api from '@/lib/api'
import type {
  Site,
  SiteCreateInput,
  SiteListResponse,
  SitePageListResponse,
  SiteUpdateInput,
} from '@/types/site'

export interface SitesFilters {
  page?: number
  limit?: number
  status?: 'active' | 'inactive'
  search?: string
}

export function useSitesQuery(filters: SitesFilters) {
  return useQuery({
    queryKey: ['sites', filters],
    queryFn: async () => {
      const { data } = await api.get<SiteListResponse>('/sites', { params: filters })
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useSitePagesQuery(siteId: string | null) {
  return useQuery({
    queryKey: ['sites', siteId, 'pages'],
    queryFn: async () => {
      const { data } = await api.get<SitePageListResponse>(`/sites/${siteId}/pages`)
      return data
    },
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateSite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SiteCreateInput) => {
      const { data } = await api.post<Site>('/sites', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useUpdateSite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: SiteUpdateInput }) => {
      const { data } = await api.put<Site>(`/sites/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useDeleteSite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sites/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export interface CrawlSiteResult {
  message: string
  crawled: number
  discovered: number
  failed: number
}

export function useCrawlSite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<CrawlSiteResult>(`/sites/${id}/crawl`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      queryClient.invalidateQueries({ queryKey: ['pages'] })
    },
  })
}
