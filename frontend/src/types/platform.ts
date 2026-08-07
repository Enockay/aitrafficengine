export interface PlatformAccount {
  id: string
  platform: string
  account_name: string | null
  account_handle: string | null
  avatar_url: string | null
  is_active: boolean
  token_expires_at: string | null
  created_at: string
}

export interface PlatformStatus {
  platform: string
  configured: boolean
  accounts: PlatformAccount[]
}

export interface PlatformCredentialStatus {
  platform: string
  configured: boolean
  source: 'database' | 'environment' | 'none'
  client_id_preview: string | null
  updated_at: string | null
  is_enabled: boolean
}
