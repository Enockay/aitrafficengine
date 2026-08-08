import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { ActivityLogSection } from '@/components/settings/ActivityLogSection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useSubscriptionQuery, useUsageQuery } from '@/hooks/useBilling'
import { useAuth } from '@/hooks/useAuth'
import { COUNTRY_CODES } from '@/lib/countryCodes'
import { getErrorMessage } from '@/lib/errors'

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const { data: subscription } = useSubscriptionQuery()
  const { data: usage } = useUsageQuery()
  const [copied, setCopied] = useState(false)

  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setFullName(user.full_name)
    setCompanyName(user.company_name ?? '')
    setPhoneCountryCode(user.phone_country_code ?? '')
    setPhoneNumber(user.phone_number ?? '')
    setTimezone(user.timezone)
  }, [user])

  async function handleCopyReferralCode() {
    if (!user?.referral_code) return
    await navigator.clipboard.writeText(user.referral_code)
    setCopied(true)
    toast.success('Referral code copied.')
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSaveProfile() {
    setIsSaving(true)
    try {
      await updateProfile({
        full_name: fullName,
        company_name: companyName,
        phone_country_code: phoneNumber ? phoneCountryCode : '',
        phone_number: phoneNumber,
        timezone,
      })
      toast.success('Profile updated.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update profile'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-h1 text-text-primary">Settings</h1>

      <div className="mb-8 rounded-lg border border-border-default bg-bg-secondary p-5">
        <p className="mb-4 text-body-sm font-medium text-text-primary">Account</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="settings_full_name">Name</Label>
            <Input id="settings_full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings_email">Email</Label>
            <Input id="settings_email" value={user?.email ?? ''} disabled />
            {user && !user.is_email_verified && (
              <p className="text-caption text-accent-yellow">Not verified</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings_company">Company</Label>
            <Input
              id="settings_company"
              placeholder="Acme Inc."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings_phone">Phone</Label>
            <div className="flex gap-2">
              <Select
                id="settings_phone_country_code"
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
              <Input
                id="settings_phone"
                type="tel"
                placeholder="555 123 4567"
                className="flex-1"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings_timezone">Timezone</Label>
            <Input id="settings_timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </div>
        </div>

        <Button className="mt-5" disabled={isSaving} onClick={handleSaveProfile}>
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </div>

      {subscription && (
        <div className="mb-8 rounded-lg border border-border-default bg-bg-secondary p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-body-sm font-medium text-text-primary">
              Plan & usage — <span className="capitalize">{subscription.plan_code}</span>
              {subscription.status === 'trialing' && (
                <span className="ml-2 text-caption font-normal text-accent-yellow">Trial</span>
              )}
            </p>
            <Link to="/billing" className="text-caption text-accent-blue hover:underline">
              Manage plan
            </Link>
          </div>
          {usage && (
            <div className="grid grid-cols-1 gap-3 text-body-sm text-text-secondary sm:grid-cols-3">
              <p>
                Sites: {usage.sites_used}
                {usage.sites_limit !== null ? ` / ${usage.sites_limit}` : ''}
              </p>
              <p>
                Posts this month: {usage.posts_used_this_month}
                {usage.posts_limit !== null ? ` / ${usage.posts_limit}` : ''}
              </p>
              <p>
                Flyers this month: {usage.flyers_used_this_month}
                {usage.flyers_limit !== null ? ` / ${usage.flyers_limit}` : ''}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mb-8 rounded-lg border border-border-default bg-bg-secondary p-5">
        <p className="mb-1 text-body-sm font-medium text-text-primary">Your referral code</p>
        <p className="mb-3 text-caption text-text-muted">Share this with anyone you refer to AI Traffic Engine.</p>
        <div className="flex max-w-xs items-center gap-2">
          <div className="flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-body-sm text-text-primary">
            {user?.referral_code}
          </div>
          <button
            type="button"
            onClick={handleCopyReferralCode}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border-default text-text-secondary transition-colors hover:text-text-primary"
            aria-label="Copy referral code"
          >
            {copied ? <Check size={15} className="text-accent-green" /> : <Copy size={15} />}
          </button>
        </div>
      </div>

      <ActivityLogSection />
    </div>
  )
}
