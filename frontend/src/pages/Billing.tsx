import { useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { Check, Globe, Image as ImageIcon, Loader2, Send, ShieldCheck, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePlansQuery, useSubscribe, useSubscriptionQuery, useUsageQuery, type Plan } from '@/hooks/useBilling'

const RECOMMENDED_PLAN_CODE = 'growth'

const PLAN_TAGLINE: Record<string, string> = {
  starter: 'For one site, getting the pipeline running end to end.',
  growth: 'For running this across multiple sites on a real schedule.',
  agency: 'Higher volume across many brands, with room to grow.',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function usagePct(used: number, limit: number | null) {
  return limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
}

function barColor(pct: number) {
  if (pct >= 90) return 'bg-accent-red'
  if (pct >= 70) return 'bg-accent-yellow'
  return 'bg-accent-blue'
}

function UsageMetric({
  icon: Icon,
  label,
  used,
  limit,
}: {
  icon: typeof Globe
  label: string
  used: number
  limit: number | null
}) {
  const pct = usagePct(used, limit)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-body-sm text-text-secondary">
        <Icon size={14} className="text-text-muted" />
        <span className="flex-1">{label}</span>
        <span className="font-medium text-text-primary">
          {used}
          {limit !== null && <span className="text-text-muted"> / {limit}</span>}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
        <div
          className={`h-full rounded-full transition-all ${barColor(pct)}`}
          style={{ width: `${limit ? pct : 0}%` }}
        />
      </div>
    </div>
  )
}

function PlanCard({
  plan,
  isCurrent,
  isPending,
  onSubscribe,
}: {
  plan: Plan
  isCurrent: boolean
  isPending: boolean
  onSubscribe: (code: string) => void
}) {
  const recommended = plan.code === RECOMMENDED_PLAN_CODE

  return (
    <div
      className={`relative flex flex-col rounded-xl border p-6 transition-shadow ${
        recommended
          ? 'border-accent-red/40 bg-bg-secondary shadow-[0_20px_40px_-20px_rgba(229,72,77,0.25)]'
          : 'border-border-default bg-bg-secondary'
      }`}
    >
      {recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-red px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
          Most popular
        </span>
      )}

      <p className="text-body font-semibold text-text-primary">{plan.name}</p>
      <p className="mt-1.5 text-caption leading-relaxed text-text-secondary">{PLAN_TAGLINE[plan.code]}</p>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-h1 text-text-primary">${plan.price_usd}</span>
        <span className="text-caption text-text-muted">/mo</span>
      </div>

      <ul className="mt-6 flex-1 space-y-3 text-body-sm text-text-secondary">
        <li className="flex items-start gap-2.5">
          <Check size={15} className="mt-0.5 shrink-0 text-accent-green" />
          {plan.max_sites} connected site{plan.max_sites === 1 ? '' : 's'}
        </li>
        <li className="flex items-start gap-2.5">
          <Check size={15} className="mt-0.5 shrink-0 text-accent-green" />
          {plan.max_posts_per_month} posts / mo
        </li>
        <li className="flex items-start gap-2.5">
          <Check size={15} className="mt-0.5 shrink-0 text-accent-green" />
          {plan.max_flyers_per_month} flyers / mo
        </li>
        <li className="flex items-start gap-2.5">
          <Check size={15} className="mt-0.5 shrink-0 text-accent-green" />
          Schedule up to {plan.schedule_horizon_days} days ahead
        </li>
      </ul>

      <Button
        className="mt-6 h-11 w-full"
        variant={isCurrent ? 'secondary' : recommended ? 'default' : 'outline'}
        disabled={isCurrent || isPending}
        onClick={() => onSubscribe(plan.code)}
      >
        {isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isCurrent ? (
          'Current plan'
        ) : (
          'Subscribe'
        )}
      </Button>
    </div>
  )
}

export default function Billing() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: plans, isLoading: plansLoading } = usePlansQuery()
  const { data: subscription } = useSubscriptionQuery()
  const { data: usage } = useUsageQuery()
  const subscribe = useSubscribe()

  useEffect(() => {
    if (searchParams.get('reference')) {
      toast.success('Payment received — your plan will update shortly.')
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubscribe(planCode: string) {
    try {
      await subscribe.mutateAsync(planCode)
    } catch (error) {
      const message = isAxiosError(error) ? error.response?.data?.detail : undefined
      toast.error(message ?? 'Failed to start checkout')
    }
  }

  const trialDaysLeft =
    subscription?.status === 'trialing' && subscription.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86_400_000))
      : null

  return (
    <div>
      <h1 className="mb-1 text-h1 text-text-primary">Billing</h1>
      <p className="mb-6 text-body-sm text-text-secondary">
        Manage your plan and see how much of it you've used this month.
      </p>

      {subscription && (
        <div className="mb-8 rounded-xl border border-border-default bg-bg-secondary p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <p className="text-body-sm font-medium text-text-primary">
                Current plan — <span className="capitalize">{subscription.plan_code}</span>
              </p>
              {subscription.status === 'trialing' && trialDaysLeft !== null && (
                <Badge variant="warning">
                  Trial · {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left
                </Badge>
              )}
              {subscription.status === 'active' && (
                <Badge variant="success">Active</Badge>
              )}
              {(subscription.status === 'past_due' || subscription.status === 'cancelled') && (
                <Badge variant="error">{subscription.status === 'past_due' ? 'Past due' : 'Cancelled'}</Badge>
              )}
            </div>
            {subscription.status === 'active' && subscription.current_period_end && (
              <p className="text-caption text-text-muted">Renews {formatDate(subscription.current_period_end)}</p>
            )}
          </div>

          {usage && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <UsageMetric icon={Globe} label="Sites" used={usage.sites_used} limit={usage.sites_limit} />
              <UsageMetric
                icon={Send}
                label="Posts this month"
                used={usage.posts_used_this_month}
                limit={usage.posts_limit}
              />
              <UsageMetric
                icon={ImageIcon}
                label="Flyers this month"
                used={usage.flyers_used_this_month}
                limit={usage.flyers_limit}
              />
            </div>
          )}
        </div>
      )}

      {plansLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      )}

      {plans && (
        <div className="grid grid-cols-1 gap-5 pt-3 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              isCurrent={subscription?.status === 'active' && subscription.plan_code === plan.code}
              isPending={subscribe.isPending}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-text-muted">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} /> Payments secured by Paystack
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles size={14} /> Cancel or change plans anytime
        </span>
      </div>
    </div>
  )
}
