export interface User {
  id: string
  email: string
  full_name: string
  role: string
  company_name: string | null
  phone_country_code: string | null
  phone_number: string | null
  timezone: string
  referral_code: string
  is_email_verified: boolean
}

export interface RegisterPayload {
  email: string
  password: string
  full_name: string
  company_name?: string
  phone_country_code?: string
  phone_number?: string
  timezone: string
  referral_code?: string
}

export interface ProfileUpdatePayload {
  full_name?: string
  company_name?: string
  phone_country_code?: string
  phone_number?: string
  timezone?: string
}
