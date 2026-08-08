import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, LogIn, Mail, XCircle } from 'lucide-react'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/lib/errors'

type Status = 'verifying' | 'success' | 'error'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { verifyEmail, resendVerification } = useAuth()

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error')
  const [errorMessage, setErrorMessage] = useState('Missing verification link.')
  const ranRef = useRef(false)

  const [resendEmail, setResendEmail] = useState('')
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (!token || ranRef.current) return
    ranRef.current = true

    verifyEmail(token)
      .then(() => {
        setStatus('success')
        setTimeout(() => navigate('/dashboard'), 1200)
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, 'This verification link is invalid or has expired.'))
        setStatus('error')
      })
  }, [token, verifyEmail, navigate])

  async function handleResend(event: FormEvent) {
    event.preventDefault()
    setIsResending(true)
    try {
      await resendVerification(resendEmail)
      toast.success('If that account needs verification, a new link is on its way.')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-red">
            <LogIn size={16} className="text-white" />
          </div>
          <span className="text-h3 text-text-primary">AI Traffic Engine</span>
        </div>

        {status === 'verifying' && (
          <div className="flex flex-col items-center py-8 text-center">
            <Loader2 size={28} className="animate-spin text-accent-red" />
            <p className="mt-4 text-body text-text-secondary">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 size={32} className="text-accent-green" />
            <h2 className="mt-4 text-h1 text-text-primary">Email verified</h2>
            <p className="mt-1.5 text-body text-text-secondary">Taking you to your dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="flex flex-col items-center text-center">
              <XCircle size={32} className="text-accent-red" />
              <h2 className="mt-4 text-h1 text-text-primary">Verification failed</h2>
              <p className="mt-1.5 text-body text-text-secondary">{errorMessage}</p>
            </div>

            <Link to="/login" className="mt-6 block">
              <Button variant="outline" className="w-full">
                Go to login
              </Button>
            </Link>

            <div className="mt-6 border-t border-border-default pt-6">
              <p className="text-body-sm text-text-secondary">
                Need a new link? Enter your email and we'll send another one.
              </p>
              <form onSubmit={handleResend} className="mt-3 space-y-3">
                <Label htmlFor="resend-email" className="sr-only">
                  Email
                </Label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <Input
                    id="resend-email"
                    type="email"
                    placeholder="you@company.com"
                    required
                    className="pl-9"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="secondary" className="w-full" disabled={isResending}>
                  {isResending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Resend verification email'
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
