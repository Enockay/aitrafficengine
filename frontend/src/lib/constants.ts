export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

// Cloudflare Turnstile site key — public by design (it's meant to be embedded in the
// page), unlike the secret key which stays backend-only. Empty in local dev skips
// rendering the widget (see TurnstileWidget) since the backend also skips
// verification when its secret key is unset.
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ''
