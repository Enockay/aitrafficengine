import { isAxiosError } from 'axios'

// FastAPI returns `detail` as a plain string for app-raised HTTPExceptions, but as an
// array of { msg, loc, type } objects for automatic pydantic 422 validation errors.
// Passing that array straight into toast.error()/JSX crashes the whole app (React
// can't render an array of objects as a child, and there's no error boundary to catch
// it) — always normalize to a string here instead of trusting the shape.
export function getErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg
  return fallback
}
