export interface MetricCard {
  value: number
  delta_pct: number | null
  sparkline: number[]
}

export interface TrafficDay {
  date: string
  twitter: number
  linkedin: number
  reddit: number
}

export interface DashboardTopPost {
  id: string
  title: string | null
  platform: string
  status: string
  clicks: number
}

export interface PlatformHealth {
  platform: string
  connected: boolean
  account_handle: string | null
  last_publish_at: string | null
  rate_limit_remaining: number | null
  rate_limit_reset_at: string | null
}

export interface ActivityEvent {
  type: string
  description: string
  timestamp: string
}

export interface DashboardOverview {
  total_posts: MetricCard
  total_clicks: MetricCard
  active_schedules: MetricCard
  connected_platforms: MetricCard
  traffic_by_day: TrafficDay[]
  top_posts: DashboardTopPost[]
  platform_health: PlatformHealth[]
  recent_activity: ActivityEvent[]
}
