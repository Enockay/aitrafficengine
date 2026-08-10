import { useQuery } from '@tanstack/react-query'

import api from '@/lib/api'

export interface TrafficDayPoint {
  date: string
  sessions: number
  pageviews: number
}

export interface TrafficBreakdownEntry {
  label: string
  count: number
}

export interface TrafficCrawlEvent {
  id: string
  site_name: string
  site_domain: string
  crawled: number
  discovered: number
  failed: number
  triggered_by: string | null
  created_at: string
}

export interface AdminTrafficSummary {
  total_sessions: number
  total_pageviews: number
  unique_visitors: number
  total_crawls: number
  sessions_by_day: TrafficDayPoint[]
  top_countries: TrafficBreakdownEntry[]
  top_browsers: TrafficBreakdownEntry[]
  top_devices: TrafficBreakdownEntry[]
  recent_crawls: TrafficCrawlEvent[]
}

export interface AdminTrafficSession {
  id: string
  user_email: string
  ip_address: string | null
  country: string | null
  city: string | null
  browser: string | null
  os: string | null
  device_type: string | null
  started_at: string
  last_seen_at: string
  duration_seconds: number
  page_count: number
}

export interface AdminTrafficSessionListResponse {
  items: AdminTrafficSession[]
  total: number
  page: number
  limit: number
}

export function useAdminTrafficSummaryQuery() {
  return useQuery({
    queryKey: ['admin', 'traffic', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<AdminTrafficSummary>('/admin/traffic/summary')
      return data
    },
    staleTime: 60 * 1000,
  })
}

export function useAdminTrafficSessionsQuery(params: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: ['admin', 'traffic', 'sessions', params],
    queryFn: async () => {
      const { data } = await api.get<AdminTrafficSessionListResponse>('/admin/traffic/sessions', { params })
      return data
    },
    staleTime: 30 * 1000,
  })
}
