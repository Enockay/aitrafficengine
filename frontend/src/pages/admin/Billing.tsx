import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CreditCard, Loader2, Receipt, Users, Wallet } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { useAdminPaymentsQuery, useRevenueSummaryQuery } from '@/hooks/useAdminBilling'
import { useAdminStatsQuery } from '@/hooks/useAdminStats'
import { cn } from '@/lib/utils'

const CHART_COLORS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4']

// Mirrors backend/app/services/plans.py — only used to render an MRR-by-plan
// breakdown client-side; the authoritative price still lives on the backend.
const PLAN_PRICE_USD: Record<string, number> = { starter: 20, growth: 49, agency: 149 }
const PLAN_CHART_VAR: Record<string, string> = { starter: '--chart-2', growth: '--chart-4', agency: '--chart-1' }

const TONE_CLASSES = {
  blue: 'bg-accent-blue/10 text-accent-blue',
  green: 'bg-accent-green/10 text-accent-green',
  purple: 'bg-accent-purple/10 text-accent-purple',
  red: 'bg-accent-red/10 text-accent-red',
} as const

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet
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

export default function AdminBilling() {
  const { data: summary, isLoading: summaryLoading } = useRevenueSummaryQuery()
  const { data: stats } = useAdminStatsQuery()
  const [page, setPage] = useState(1)
  const { data: payments, isLoading: paymentsLoading } = useAdminPaymentsQuery(page, 20)

  const currencies = useMemo(
    () => Array.from(new Set(summary?.monthly_series.map((p) => p.currency) ?? [])),
    [summary]
  )

  const chartData = useMemo(() => {
    if (!summary) return []
    const months = Array.from(new Set(summary.monthly_series.map((p) => p.month))).sort()
    return months.map((month) => {
      const row: Record<string, string | number> = { month }
      for (const currency of currencies) {
        const point = summary.monthly_series.find((p) => p.month === month && p.currency === currency)
        row[currency] = point?.amount ?? 0
      }
      return row
    })
  }, [summary, currencies])

  const planEntries = stats ? Object.entries(stats.users_by_plan).sort((a, b) => b[1] - a[1]) : []
  const payingUsers = planEntries.reduce((sum, [, count]) => sum + count, 0)
  const arpu = payingUsers > 0 && summary ? summary.mrr_estimate_usd / payingUsers : 0

  const pieData = planEntries
    .map(([plan, count]) => ({
      plan,
      value: count * (PLAN_PRICE_USD[plan] ?? 0),
    }))
    .filter((d) => d.value > 0)

  return (
    <div>
      <h1 className="mb-1 text-h1 text-text-primary">Revenue</h1>
      <p className="mb-6 text-body-sm text-text-secondary">Real payment history collected via Paystack.</p>

      {summaryLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      )}

      {summary && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={Wallet} label="Estimated MRR" value={`$${summary.mrr_estimate_usd.toLocaleString()}`} tone="green" />
            <StatTile icon={Users} label="Paying users" value={payingUsers} tone="blue" />
            <StatTile
              icon={CreditCard}
              label="ARPU"
              value={payingUsers > 0 ? `$${arpu.toFixed(2)}` : '—'}
              tone="purple"
            />
            <StatTile icon={Receipt} label="Payments recorded" value={payments?.total ?? 0} tone="red" />
          </div>

          {Object.entries(summary.total_revenue_by_currency).length > 0 && (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(summary.total_revenue_by_currency).map(([currency, amount]) => (
                <Card key={currency} className="p-5">
                  <div className="flex items-center gap-2 text-body-sm text-text-secondary">
                    <Wallet size={14} className="text-text-muted" /> Total revenue ({currency})
                  </div>
                  <p className="mt-2 text-metric-lg text-text-primary">{amount.toLocaleString()}</p>
                </Card>
              ))}
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-5">
              <p className="mb-4 text-body-sm font-medium text-text-primary">MRR by plan</p>
              {pieData.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-body-sm text-text-muted">
                  No active subscriptions yet.
                </div>
              ) : (
                <>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="plan"
                          innerRadius="60%"
                          outerRadius="90%"
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {pieData.map((entry) => (
                            <Cell
                              key={entry.plan}
                              fill={`rgb(var(${PLAN_CHART_VAR[entry.plan] ?? '--chart-5'}))`}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`$${Number(value ?? 0).toLocaleString()}`, 'MRR']}
                          contentStyle={{
                            background: 'rgb(var(--bg-surface))',
                            border: '1px solid rgb(var(--border-default))',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          labelStyle={{ color: 'rgb(var(--text-primary))' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-2">
                    {pieData.map((entry) => (
                      <div key={entry.plan} className="flex items-center justify-between text-body-sm">
                        <span className="flex items-center gap-2 capitalize text-text-secondary">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: `rgb(var(${PLAN_CHART_VAR[entry.plan] ?? '--chart-5'}))` }}
                          />
                          {entry.plan}
                        </span>
                        <span className="font-medium text-text-primary">${entry.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <Card className="p-5 lg:col-span-2">
              <p className="mb-4 text-body-sm font-medium text-text-primary">Monthly revenue</p>
              {chartData.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-body-sm text-text-muted">
                  No payments recorded yet.
                </div>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        {currencies.map((currency, i) => (
                          <linearGradient key={currency} id={`rev-${currency}`} x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="0%"
                              stopColor={`rgb(var(${CHART_COLORS[i % CHART_COLORS.length]}))`}
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="100%"
                              stopColor={`rgb(var(${CHART_COLORS[i % CHART_COLORS.length]}))`}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        ))}
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
                      {currencies.map((currency, i) => (
                        <Area
                          key={currency}
                          type="monotone"
                          dataKey={currency}
                          name={currency}
                          stroke={`rgb(var(${CHART_COLORS[i % CHART_COLORS.length]}))`}
                          strokeWidth={1.5}
                          fill={`url(#rev-${currency})`}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-border-default bg-bg-secondary">
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">User</th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">Plan</th>
              <th className="px-4 py-3 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                Amount
              </th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                Channel
              </th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">Paid</th>
            </tr>
          </thead>
          <tbody>
            {paymentsLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-body-sm text-text-secondary">
                  <Loader2 size={18} className="mx-auto animate-spin" />
                </td>
              </tr>
            )}
            {!paymentsLoading && (payments?.items.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center">
                  <Receipt size={22} className="mx-auto mb-2 text-text-muted" />
                  <p className="text-body-sm text-text-secondary">No payments recorded yet.</p>
                  <p className="mt-0.5 text-caption text-text-muted">
                    Payments will show up here as soon as Paystack confirms a charge.
                  </p>
                </td>
              </tr>
            )}
            {payments?.items.map((payment, index) => (
              <tr
                key={payment.id}
                className={`border-b border-border-default last:border-0 ${
                  index % 2 === 1 ? 'bg-bg-secondary/30' : ''
                }`}
              >
                <td className="px-4 py-3 text-body-sm text-text-primary">{payment.user_email}</td>
                <td className="px-4 py-3 text-body-sm capitalize text-text-secondary">{payment.plan_code ?? '—'}</td>
                <td className="px-4 py-3 text-right text-body-sm tabular-nums font-medium text-text-primary">
                  {payment.amount} {payment.currency}
                </td>
                <td className="px-4 py-3 text-body-sm capitalize text-text-secondary">{payment.channel ?? '—'}</td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">{formatDate(payment.paid_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payments && payments.total > payments.limit && (
        <div className="mt-4 flex items-center justify-center gap-3 text-body-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md px-3 py-1.5 text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-text-muted">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * payments.limit >= payments.total}
            className="rounded-md px-3 py-1.5 text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
