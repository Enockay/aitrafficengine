export type PageStatus = 'pending' | 'crawled' | 'failed'

export interface Page {
  id: string
  site_id: string
  url: string
  title: string | null
  meta_description: string | null
  summary: string | null
  content_text: string | null
  hero_image_url: string | null
  key_points: string[] | null
  keywords: string[] | null
  status: PageStatus
  last_crawled_at: string | null
  created_at: string
  updated_at: string
  posts_count: number
}

export interface PageListResponse {
  items: Page[]
  total: number
  page: number
  limit: number
}

export interface PageCreateInput {
  site_id: string
  url: string
}
