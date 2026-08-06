import type { Post } from '@/types/post'

export interface VariantEntry {
  post: Post
  total_clicks: number
}

export interface GenerateVariantsResponse {
  variant_group_id: string
  variants: VariantEntry[]
}
