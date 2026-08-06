import { type FormEvent, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { Building2, Eye, EyeOff, Gift, Loader2, Lock, LogIn, Mail, MailCheck, Phone, User } from 'lucide-react'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { COUNTRY_CODES } from '@/lib/countryCodes'
import { getClientTimezone } from '@/lib/timezone'

const RESEND_COOLDOWN_SECONDS = 30

export default function Register() {
  const { register, resendVerification } = useAuth()
  const [searchParams] = useSearchParams()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [registered, setRegistered] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) setReferralCode(ref)
  }, [searchParams])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await register({
        email,
        password,
        full_name: fullName,
        company_name: companyName || undefined,
        phone_country_code: phoneNumber ? phoneCountryCode || undefined : undefined,
        phone_number: phoneNumber || undefined,
        timezone: getClientTimezone(),
        referral_code: referralCode || undefined,
      })
      setRegistered(true)
    } catch (error) {
      const detail = isAxiosError(error) ? error.response?.data?.detail : undefined
      const message = Array.isArray(detail) ? detail[0]?.msg : detail
      toast.error(message ?? 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResend() {
    setIsResending(true)
    try {
      await resendVerification(email)
      toast.success('Verification email sent.')
      setCooldown(RESEND_COOLDOWN_SECONDS)
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

        {registered ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-green/15 text-accent-green">
              <MailCheck size={22} />
            </div>
            <h2 className="mt-4 text-h1 text-text-primary">Check your inbox</h2>
            <p className="mt-1.5 text-body text-text-secondary">
              We've sent a verification link to <span className="text-text-primary">{email}</span>. Click it to
              activate your account — check your spam folder if it doesn't show up in a minute.
            </p>
            <Button
              variant="outline"
              className="mt-6 w-full"
              disabled={isResending || cooldown > 0}
              onClick={handleResend}
            >
              {isResending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : cooldown > 0 ? (
                `Resend email (${cooldown}s)`
              ) : (
                'Resend email'
              )}
            </Button>
            <p className="mt-6 text-center text-body-sm text-text-secondary">
              Already verified?{' '}
              <Link to="/login" className="font-medium text-accent-red hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-h1 text-text-primary">Create your account</h2>
            <p className="mt-1.5 text-body text-text-secondary">Start driving organic traffic today</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <div className="relative">
                  <User
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <Input
                    id="full_name"
                    placeholder="Jane Doe"
                    required
                    autoFocus
                    className="pl-9"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

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
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
                <p className="text-caption text-text-muted">
                  At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Company name (optional)</Label>
                <div className="relative">
                  <Building2
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <Input
                    id="company_name"
                    placeholder="Acme Inc."
                    className="pl-9"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone (optional)</Label>
                <div className="flex gap-2">
                  <Select
                    id="phone_country_code"
                    aria-label="Country code"
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="w-32 pr-7"
                  >
                    <option value="">Code</option>
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.label} value={c.code}>
                        {c.code} {c.label}
                      </option>
                    ))}
                  </Select>
                  <div className="relative flex-1">
                    <Phone
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <Input
                      id="phone_number"
                      type="tel"
                      placeholder="555 123 4567"
                      className="pl-9"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referral_code">Referral code (optional)</Label>
                <div className="relative">
                  <Gift
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <Input
                    id="referral_code"
                    placeholder="e.g. QJSCBQPU"
                    className="pl-9 uppercase"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-body-sm text-text-secondary">
              Already have an account?{' '}
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
