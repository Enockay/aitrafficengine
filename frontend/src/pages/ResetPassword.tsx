import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, LogIn, XCircle } from 'lucide-react'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/lib/errors'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { resetPassword } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!token) return
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setIsSubmitting(true)
    try {
      await resetPassword(token, password)
      setStatus('success')
      setTimeout(() => navigate('/login'), 1500)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'This reset link is invalid or has expired.'))
      setStatus('error')
    } finally {
      setIsSubmitting(false)
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

        {!token || status === 'error' ? (
          <div className="text-center">
            <XCircle size={32} className="mx-auto text-accent-red" />
            <h2 className="mt-4 text-h1 text-text-primary">Link invalid</h2>
            <p className="mt-1.5 text-body text-text-secondary">
              {token ? errorMessage : 'This password reset link is missing or malformed.'}
            </p>
            <Link to="/forgot-password" className="mt-6 block">
              <Button className="w-full">Request a new link</Button>
            </Link>
          </div>
        ) : status === 'success' ? (
          <div className="text-center">
            <CheckCircle2 size={32} className="mx-auto text-accent-green" />
            <h2 className="mt-4 text-h1 text-text-primary">Password reset</h2>
            <p className="mt-1.5 text-body text-text-secondary">Taking you to sign in...</p>
          </div>
        ) : (
          <>
            <h2 className="text-h1 text-text-primary">Choose a new password</h2>
            <p className="mt-1.5 text-body text-text-secondary">Make it at least 8 characters, mixed case and a number.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    autoFocus
                    className="pl-9 pr-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-secondary"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm password</Label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <Input
                    id="confirm_password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    className="pl-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset password'
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
