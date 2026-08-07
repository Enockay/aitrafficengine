import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  ArrowRight,
  CalendarClock,
  FileText,
  Globe,
  Loader2,
  Plug2,
  Send,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { useAdminStatsQuery } from '@/hooks/useAdminStats'
import { useRevenueSummaryQuery } from '@/hooks/useAdminBilling'
import { cn } from '@/lib/utils'

const TONE_CLASSES = {
  blue: 'bg-accent-blue/10 text-accent-blue',
  green: 'bg-accent-green/10 text-accent-green',
  purple: 'bg-accent-purple/10 text-accent-purple',
  yellow: 'bg-accent-yellow/10 text-accent-yellow',
  red: 'bg-accent-red/10 text-accent-red',
  neutral: 'bg-bg-tertiary text-text-muted',
} as const

const PLAN_CHART_VAR: Record<string, string> = {
  starter: '--chart-2',
  growth: '--chart-4',
  agency: '--chart-1',
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users
  label: string
  value: string | number
  tone: keyof typeof TONE_CLASSES
}) {
  return (
    <Card className="p-5">
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-md', TONE_CLASSES[tone])}>
        <Icon size={16} />
      </div>
      <p className="text-metric-label uppercase text-text-muted">{label}</p>
      <p className="mt-1 text-metric-lg text-text-primary">{value}</p>
    </Card>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeAgo(value: string) {
  const diffMs = Date.now() - new Date(value).getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return formatDate(value)
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const QUICK_LINKS = [
  { label: 'Manage users', to: '/admin/users', icon: Users },
  { label: 'Review revenue', to: '/admin/billing', icon: Wallet },
  { label: 'Inspect sites', to: '/admin/sites', icon: Globe },
  { label: 'Check schedules', to: '/admin/schedules', icon: CalendarClock },
  { label: 'Configure integrations', to: '/admin/integrations', icon: Plug2 },
]

export default function AdminOverview() {
  const { data: stats, isLoading, isError } = useAdminStatsQuery()
  const { data: revenue } = useRevenueSummaryQuery()

  const planEntries = stats ? Object.entries(stats.users_by_plan).sort((a, b) => b[1] - a[1]) : []
  const planTotal = planEntries.reduce((sum, [, count]) => sum + count, 0)

  const revenueByMonth = revenue
    ? Array.from(new Set(revenue.monthly_series.map((p) => p.month)))
        .sort()
        .slice(-6)
        .map((month) => ({
          month,
          total: revenue.monthly_series.filter((p) => p.month === month).reduce((sum, p) => sum + p.amount, 0),
        }))
    : []

  return (
    <div>
      <h1 className="mb-1 text-h1 text-text-primary">Admin Overview</h1>
      <p className="mb-6 text-body-sm text-text-secondary">Platform-wide stats across every user.</p>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      )}
      {isError && <p className="py-12 text-center text-body-sm text-accent-red">Failed to load stats.</p>}

      {stats && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile icon={Users} label="Total users" value={stats.total_users} tone="blue" />
            <StatTile icon={ShieldCheck} label="Active users" value={stats.active_users} tone="green" />
            <StatTile icon={Globe} label="Total sites" value={stats.total_sites} tone="purple" />
            <StatTile icon={FileText} label="Total posts" value={stats.total_posts} tone="yellow" />
            <StatTile icon={Wallet} label="Estimated MRR" value={`$${stats.mrr_estimate_usd.toLocaleString()}`} tone="red" />
            <StatTile
              icon={Send}
              label="Pending schedules"
              value={stats.pending_schedules_count}
              tone={stats.pending_schedules_count > 0 ? 'yellow' : 'neutral'}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-body-sm font-medium text-text-primary">Revenue trend</p>
                <Link
                  to="/admin/billing"
                  className="flex items-center gap-1 text-caption text-accent-blue hover:underline"
                >
                  Full breakdown <ArrowRight size={12} />
                </Link>
              </div>
              {revenueByMonth.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-body-sm text-text-muted">
                  No payments recorded yet.
                </div>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueByMonth}>
                      <defs>
                        <linearGradient id="overviewRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(var(--chart-1))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="rgb(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-default))" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: 'rgb(var(--text-muted))', fontSize: 11 }}
                        axisLine={{ stroke: 'rgb(var(--border-default))' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'rgb(var(--text-muted))', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'rgb(var(--bg-surface))',
                          border: '1px solid rgb(var(--border-default))',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: 'rgb(var(--text-primary))' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Revenue"
                        stroke="rgb(var(--chart-1))"
                        strokeWidth={1.5}
                        fill="url(#overviewRevenueGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <p className="mb-4 text-body-sm font-medium text-text-primary">Users by plan</p>
              {planEntries.length === 0 ? (
                <p className="text-body-sm text-text-muted">No active subscriptions yet.</p>
              ) : (
                <div className="space-y-3">
                  {planEntries.map(([plan, count]) => {
                    const pct = planTotal > 0 ? Math.round((count / planTotal) * 100) : 0
                    const colorVar = PLAN_CHART_VAR[plan] ?? '--chart-5'
                    return (
                      <div key={plan}>
                        <div className="mb-1 flex items-center justify-between text-body-sm">
                          <span className="capitalize text-text-secondary">{plan}</span>
                          <span className="font-medium text-text-primary">{count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-bg-tertiary">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: `rgb(var(${colorVar}))` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border-default p-5">
                <p className="text-body-sm font-medium text-text-primary">Recent signups</p>
                <Link
                  to="/admin/users"
                  className="flex items-center gap-1 text-caption text-accent-blue hover:underline"
                >
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              {stats.recent_signups.length === 0 ? (
                <p className="p-5 text-body-sm text-text-secondary">No signups yet.</p>
              ) : (
                <ul className="divide-y divide-border-default">
                  {stats.recent_signups.map((u) => (
                    <li key={u.id} className="flex items-center gap-3 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-purple/20 text-body-sm font-semibold text-accent-purple">
                        {getInitials(u.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-medium text-text-primary">{u.full_name}</p>
                        <p className="truncate text-caption text-text-muted">{u.email}</p>
                      </div>
                      <span className="shrink-0 text-caption text-text-muted">{timeAgo(u.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="border-b border-border-default p-5">
                <p className="text-body-sm font-medium text-text-primary">Quick actions</p>
              </div>
              <ul className="divide-y divide-border-default">
                {QUICK_LINKS.map((link) => {
                  const Icon = link.icon
                  return (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="group flex items-center gap-3 p-4 text-body-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                      >
                        <Icon size={15} className="shrink-0 text-text-muted group-hover:text-text-secondary" />
                        <span className="flex-1">{link.label}</span>
                        <ArrowRight
                          size={13}
                          className="shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
