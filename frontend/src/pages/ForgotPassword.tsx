import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, LogIn, Mail, MailCheck } from 'lucide-react'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/lib/errors'

export default function ForgotPassword() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await forgotPassword(email)
      setSubmitted(true)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Something went wrong'))
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

        {submitted ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-green/15 text-accent-green">
              <MailCheck size={22} />
            </div>
            <h2 className="mt-4 text-h1 text-text-primary">Check your inbox</h2>
            <p className="mt-1.5 text-body text-text-secondary">
              If an account exists for <span className="text-text-primary">{email}</span>, we've sent a link to
              reset your password. It expires in 1 hour.
            </p>
            <Link to="/login" className="mt-6 block">
              <Button variant="outline" className="w-full">
                Back to sign in
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-h1 text-text-primary">Forgot your password?</h2>
            <p className="mt-1.5 text-body text-text-secondary">
              Enter your email and we'll send you a link to reset it.
            </p>

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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-body-sm text-text-secondary">
              Remembered it?{' '}
              <Link to="/login" className="font-medium text-accent-red hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
