export interface Flyer {
  id: string
  page_id: string
  template_name: string
  image_url: string
  headline: string | null
  subheadline: string | null
  cta_text: string
  status: string
  created_at: string
}

export interface FlyerListResponse {
  items: Flyer[]
  total: number
  page: number
  limit: number
}

export interface GenerateFlyerInput {
  page_id: string
  template_name?: string
  headline?: string
  subheadline?: string
  cta_text?: string
  image_prompt?: string
}
