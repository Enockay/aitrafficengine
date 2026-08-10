import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Eye,
  Globe,
  Loader2,
  Monitor,
  RefreshCw,
  Search,
  Smartphone,
  Tablet,
  Users,
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAdminTrafficSessionsQuery, useAdminTrafficSummaryQuery } from '@/hooks/useAdminTraffic'
import { cn } from '@/lib/utils'

const BREAKDOWN_CHART_VARS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5']
const SESSIONS_PAGE_LIMIT = 15

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string | number
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
        <Icon size={16} />
      </div>
      <p className="text-metric-label uppercase text-text-muted">{label}</p>
      <p className="mt-1 text-metric-lg text-text-primary">{value}</p>
    </Card>
  )
}

function DeviceIcon({ deviceType }: { deviceType: string | null }) {
  if (deviceType === 'mobile') return <Smartphone size={13} className="text-text-muted" />
  if (deviceType === 'tablet') return <Tablet size={13} className="text-text-muted" />
  return <Monitor size={13} className="text-text-muted" />
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgb(var(--bg-surface))',
    border: '1px solid rgb(var(--border-default))',
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: 'rgb(var(--text-primary))' },
}

// Devices is a clean part-to-whole split of few categories — a donut reads at a
// glance. Browsers/locations can run to 6 segments with close values, where a pie
// gets hard to compare — those stay bar charts, one hue, direct end-labels.
function PieBreakdownCard({ title, entries }: { title: string; entries: { label: string; count: number }[] }) {
  const total = entries.reduce((sum, e) => sum + e.count, 0)
  return (
    <Card className="p-5">
      <p className="mb-4 text-body-sm font-medium text-text-primary">{title}</p>
      {entries.length === 0 || total === 0 ? (
        <p className="text-body-sm text-text-muted">No data yet.</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={entries}
                dataKey="count"
                nameKey="label"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                cornerRadius={3}
                stroke="rgb(var(--bg-secondary))"
                strokeWidth={2}
              >
                {entries.map((entry, i) => (
                  <Cell key={entry.label} fill={`rgb(var(${BREAKDOWN_CHART_VARS[i] ?? '--chart-5'}))`} />
                ))}
              </Pie>
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

function BarBreakdownCard({
  title,
  entries,
  colorVar,
}: {
  title: string
  entries: { label: string; count: number }[]
  colorVar: string
}) {
  return (
    <Card className="p-5">
      <p className="mb-4 text-body-sm font-medium text-text-primary">{title}</p>
      {entries.length === 0 ? (
        <p className="text-body-sm text-text-muted">No data yet.</p>
      ) : (
        <div style={{ height: Math.max(140, entries.length * 34) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={entries} layout="vertical" margin={{ left: 4, right: 28, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-default))" horizontal={false} />
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={90}
                tick={{ fill: 'rgb(var(--text-secondary))', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip {...CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgb(var(--bg-tertiary))' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={`rgb(var(${colorVar}))`} barSize={16}>
                <LabelList
                  dataKey="count"
                  position="right"
                  style={{ fill: 'rgb(var(--text-primary))', fontSize: 11 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

function timeAgo(value: string) {
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function AdminTraffic() {
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useAdminTrafficSummaryQuery()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data: sessions, isLoading: sessionsLoading } = useAdminTrafficSessionsQuery({
    page,
    limit: SESSIONS_PAGE_LIMIT,
    search: search || undefined,
  })
  const totalPages = sessions ? Math.max(1, Math.ceil(sessions.total / SESSIONS_PAGE_LIMIT)) : 1

  return (
    <div>
      <h1 className="mb-1 text-h1 text-text-primary">Traffic</h1>
      <p className="mb-6 text-body-sm text-text-secondary">
        Who's visiting the app, where from, and what the crawler's been doing on customers' sites — last 30 days.
      </p>

      {summaryLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      )}
      {summaryError && <p className="py-12 text-center text-body-sm text-accent-red">Failed to load traffic data.</p>}

      {summary && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile icon={Activity} label="Sessions" value={summary.total_sessions} />
            <StatTile icon={Eye} label="Pageviews" value={summary.total_pageviews} />
            <StatTile icon={Users} label="Unique visitors" value={summary.unique_visitors} />
            <StatTile icon={RefreshCw} label="Site crawls" value={summary.total_crawls} />
          </div>

          <Card className="mb-6 p-5">
            <p className="mb-4 text-body-sm font-medium text-text-primary">Sessions &amp; pageviews over time</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.sessions_by_day}>
                  <defs>
                    <linearGradient id="trafficSessionsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(var(--chart-1))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="rgb(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="trafficPageviewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(var(--chart-2))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="rgb(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-default))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'rgb(var(--text-muted))', fontSize: 11 }}
                    axisLine={{ stroke: 'rgb(var(--border-default))' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={(value: string) =>
                      new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                  />
                  <YAxis
                    tick={{ fill: 'rgb(var(--text-muted))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip
                    {...CHART_TOOLTIP_STYLE}
                    labelFormatter={(value: string) =>
                      new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    name="Sessions"
                    stroke="rgb(var(--chart-1))"
                    strokeWidth={1.5}
                    fill="url(#trafficSessionsGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pageviews"
                    name="Pageviews"
                    stroke="rgb(var(--chart-2))"
                    strokeWidth={1.5}
                    fill="url(#trafficPageviewsGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <BarBreakdownCard title="Top locations" entries={summary.top_countries} colorVar="--chart-3" />
            <BarBreakdownCard title="Browsers" entries={summary.top_browsers} colorVar="--chart-2" />
            <PieBreakdownCard title="Devices" entries={summary.top_devices} />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border-default p-5">
                <p className="text-body-sm font-medium text-text-primary">Visitor sessions</p>
                <div className="relative w-56">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <Input
                    placeholder="Search by email..."
                    className="h-8 pl-8 text-caption"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                  />
                </div>
              </div>

              {sessionsLoading && (
                <div className="flex justify-center py-10">
                  <Loader2 size={18} className="animate-spin text-text-muted" />
                </div>
              )}

              {!sessionsLoading && sessions && sessions.items.length === 0 && (
                <p className="p-5 text-body-sm text-text-secondary">No sessions recorded yet.</p>
              )}

              {!sessionsLoading && sessions && sessions.items.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border-default">
                          <th className="px-5 py-2.5 text-caption font-semibold uppercase tracking-wide text-text-muted">
                            User
                          </th>
                          <th className="px-3 py-2.5 text-caption font-semibold uppercase tracking-wide text-text-muted">
                            Location / IP
                          </th>
                          <th className="px-3 py-2.5 text-caption font-semibold uppercase tracking-wide text-text-muted">
                            Device
                          </th>
                          <th className="px-3 py-2.5 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                            Pages
                          </th>
                          <th className="px-3 py-2.5 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                            Spent
                          </th>
                          <th className="px-5 py-2.5 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                            Started
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.items.map((s, i) => (
                          <tr
                            key={s.id}
                            className={cn(
                              'border-b border-border-default last:border-0',
                              i % 2 === 1 && 'bg-bg-secondary/30'
                            )}
                          >
                            <td className="truncate px-5 py-2.5 text-body-sm text-text-primary">{s.user_email}</td>
                            <td className="px-3 py-2.5 text-caption text-text-muted">
                              <p className="text-text-secondary">
                                {s.city || s.country ? [s.city, s.country].filter(Boolean).join(', ') : 'Unknown'}
                              </p>
                              <p className="font-mono">{s.ip_address ?? '—'}</p>
                            </td>
                            <td className="px-3 py-2.5 text-caption text-text-muted">
                              <span className="flex items-center gap-1.5">
                                <DeviceIcon deviceType={s.device_type} />
                                {s.browser ?? 'Unknown'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-body-sm tabular-nums text-text-secondary">
                              {s.page_count}
                            </td>
                            <td className="px-3 py-2.5 text-right text-body-sm tabular-nums text-text-secondary">
                              {formatDuration(s.duration_seconds)}
                            </td>
                            <td className="px-5 py-2.5 text-right text-caption text-text-muted">
                              {timeAgo(s.started_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {sessions.total > SESSIONS_PAGE_LIMIT && (
                    <div className="flex items-center justify-between p-4">
                      <p className="text-caption text-text-muted">
                        Page {page} of {totalPages} · {sessions.total} sessions
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => p - 1)}
                          className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary disabled:opacity-40"
                        >
                          <ChevronLeft size={15} />
                        </button>
                        <button
                          type="button"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => p + 1)}
                          className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary disabled:opacity-40"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>

            <Card>
              <div className="border-b border-border-default p-5">
                <p className="text-body-sm font-medium text-text-primary">Recent site crawls</p>
              </div>
              {summary.recent_crawls.length === 0 ? (
                <p className="p-5 text-body-sm text-text-secondary">No crawls recorded yet.</p>
              ) : (
                <ul className="divide-y divide-border-default">
                  {summary.recent_crawls.map((crawl) => (
                    <li key={crawl.id} className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex min-w-0 items-center gap-1.5 truncate text-body-sm font-medium text-text-primary">
                          <Globe size={13} className="shrink-0 text-text-muted" />
                          {crawl.site_name}
                        </p>
                        <span className="shrink-0 text-caption text-text-muted">{timeAgo(crawl.created_at)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-caption text-text-muted">{crawl.site_domain}</p>
                      <p className="mt-1 text-caption text-text-secondary">
                        {crawl.crawled} crawled · {crawl.discovered} new · {crawl.failed} failed
                        {crawl.triggered_by ? ` · by ${crawl.triggered_by}` : ' · scheduled'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
