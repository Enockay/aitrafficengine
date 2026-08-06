// weekday: 0=Sunday..6=Saturday (matches JS Date.getDay())
export interface OptimalTimeSlot {
  weekday: number
  hour: number
  score: number
  post_count: number
  source: 'data' | 'fallback'
}

export interface OptimalTimesResponse {
  platform: string
  slots: OptimalTimeSlot[]
  sample_size: number
}
