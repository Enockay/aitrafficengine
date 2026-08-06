export type PostStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'failed'

export interface Post {
  id: string
  page_id: string
  platform: string
  content_type: string
  title: string | null
  body: string | null
  hashtags: string[] | null
  tracked_url: string | null
  status: PostStatus
  published_url: string | null
  published_at: string | null
  platform_post_id: string | null
  engagement_score: number
  media_url: string | null
  media_type: 'image' | 'video' | null
  variant_group_id: string | null
  variant_label: string | null
  created_at: string
  updated_at: string
}

export interface PostListResponse {
  items: Post[]
  total: number
  page: number
  limit: number
}

export interface PostUpdateInput {
  title?: string | null
  body?: string | null
  hashtags?: string[]
  tracked_url?: string | null
}

export const TWEET_DELIMITER = '\n\n---\n\n'

export function splitTweets(body: string | null): string[] {
  if (!body) return ['']
  const parts = body.split(TWEET_DELIMITER)
  return parts.length > 0 ? parts : ['']
}

export function joinTweets(tweets: string[]): string {
  return tweets.map((t) => t.trim()).join(TWEET_DELIMITER)
}
