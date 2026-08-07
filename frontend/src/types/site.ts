export type CrawlFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly'

export interface Site {
  id: string
  name: string
  domain: string
  description: string | null
  is_active: boolean
  crawl_frequency: CrawlFrequency
  image_url: string | null
  pages_count: number
  posts_count: number
  total_clicks: number
  last_crawled_at: string | null
  created_at: string
  updated_at: string
}

export interface SiteListResponse {
  items: Site[]
  total: number
  page: number
  limit: number
}

export interface SiteCreateInput {
  name: string
  domain: string
  description?: string
  crawl_frequency: CrawlFrequency
}

export interface SiteUpdateInput {
  name?: string
  domain?: string
  description?: string
  is_active?: boolean
  crawl_frequency?: CrawlFrequency
}

export interface SitePage {
  id: string
  url: string
  title: string | null
  status: string
  last_crawled_at: string | null
  created_at: string
}

export interface SitePageListResponse {
  items: SitePage[]
  total: number
  page: number
  limit: number
}
