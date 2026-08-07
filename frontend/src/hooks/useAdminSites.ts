import { useQuery } from '@tanstack/react-query'

import api from '@/lib/api'

export interface AdminSite {
  id: string
  name: string
  domain: string
  owner_email: string
  is_active: boolean
  pages_count: number
  posts_count: number
  total_clicks: number
  last_crawled_at: string | null
  created_at: string
}

export interface AdminSiteListResponse {
  items: AdminSite[]
  total: number
  page: number
  limit: number
}

export interface AdminSitesFilters {
  page?: number
  limit?: number
  search?: string
  status?: string
}

export function useAdminSitesQuery(filters: AdminSitesFilters) {
  return useQuery({
    queryKey: ['admin', 'sites', filters],
    queryFn: async () => {
      const { data } = await api.get<AdminSiteListResponse>('/admin/sites', { params: filters })
      return data
    },
  })
}
