import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { Eye, EyeOff, Loader2, LogIn, Mail, Lock } from 'lucide-react'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const navigate = useNavigate()
  const { login, resendVerification } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [isResending, setIsResending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setNeedsVerification(false)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 403) {
        setNeedsVerification(true)
        toast.error('Please verify your email before logging in.')
      } else {
        const message = isAxiosError(error) ? error.response?.data?.detail : undefined
        toast.error(message ?? 'Login failed')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResend() {
    setIsResending(true)
    try {
      await resendVerification(email)
      toast.success('Verification email sent.')
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

        <h2 className="text-h1 text-text-primary">Welcome back</h2>
        <p className="mt-1.5 text-body text-text-secondary">Sign in to your dashboard</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                required
                autoFocus
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-caption font-medium text-accent-red hover:underline">
                Forgot password?
              </Link>
            </div>
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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          {needsVerification && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isResending}
              onClick={handleResend}
            >
              {isResending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend verification email'
              )}
            </Button>
          )}
        </form>

        <p className="mt-6 text-center text-body-sm text-text-secondary">
          No account?{' '}
          <Link to="/register" className="font-medium text-accent-red hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
