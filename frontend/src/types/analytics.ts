export interface DailyClicks {
  date: string
  clicks: number
}

export interface PlatformClicks {
  platform: string
  clicks: number
}

export interface TopPost {
  id: string
  title: string | null
  platform: string
  status: string
  clicks: number
  page_title: string | null
  site_name: string | null
}

export interface AnalyticsSummary {
  total_clicks: number
  clicks_last_7_days: number
  total_sites: number
  total_pages: number
  total_posts: number
  published_posts: number
  clicks_by_day: DailyClicks[]
  clicks_by_platform: PlatformClicks[]
  top_posts: TopPost[]
}
