export type ScheduleStatus = 'pending' | 'published' | 'failed'

export interface Schedule {
  id: string
  post_id: string
  post_title: string | null
  platform: string
  platform_account_id: string
  platform_account_label: string | null
  scheduled_at: string
  timezone: string
  status: ScheduleStatus
  retry_count: number
  last_error: string | null
  published_at: string | null
  created_at: string
}

export interface ScheduleListResponse {
  items: Schedule[]
  total: number
}
