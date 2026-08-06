export interface ActivityLogEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface ActivityLogListResponse {
  items: ActivityLogEntry[]
  total: number
  page: number
  limit: number
}
