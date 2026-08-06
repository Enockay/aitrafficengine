export interface TrendFetchLog {
  id: string
  requested_at: string
  woeid: number
  success: boolean
  status_code: number | null
  error_detail: string | null
  raw_response: Record<string, unknown> | null
  trend_count: number
}

export interface TrendFetchLogListResponse {
  items: TrendFetchLog[]
  total: number
  page: number
  limit: number
}

export interface Trend {
  id: string
  name: string
  tweet_volume: number | null
  woeid: number
  fetched_at: string
  times_used: number
}

export interface TrendListResponse {
  items: Trend[]
  total: number
  page: number
  limit: number
}
