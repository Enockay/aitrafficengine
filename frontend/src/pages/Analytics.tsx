import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { BarChart3, Download, FileText, Loader2, MousePointerClick } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { useAnalyticsSummary, useExportAnalytics } from '@/hooks/useAnalytics'

const PLATFORM_LABEL: Record<string, string> = {
  twitter: 'X / Twitter',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  tumblr: 'Tumblr',
  pinterest: 'Pinterest',
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  draft: 'neutral',
  approved: 'info',
  scheduled: 'warning',
  published: 'success',
  failed: 'error',
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-5">
      <p className="text-metric-label uppercase text-text-muted">{label}</p>
      <p className="mt-1 text-metric-lg text-text-primary">{value}</p>
    </Card>
  )
}

export default function Analytics() {
  const [days, setDays] = useState(30)
  const { data, isLoading, isError } = useAnalyticsSummary(days)
  const exportAnalytics = useExportAnalytics()

  const chartData = data?.clicks_by_day.map((d) => ({ ...d, label: formatShortDate(d.date) })) ?? []
  const hasAnyClicks = (data?.total_clicks ?? 0) > 0

  async function handleExport(format: 'csv' | 'pdf') {
    try {
      await exportAnalytics.mutateAsync({ format, days })
    } catch {
      toast.error(`Failed to export ${format.toUpperCase()}`)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h1 text-text-primary">Analytics</h1>
        <div className="flex items-center gap-2">
          <Select className="w-40" value={String(days)} onChange={(e) => setDays(Number(e.target.value))}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={exportAnalytics.isPending}
          >
            {exportAnalytics.isPending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={exportAnalytics.isPending}
          >
            {exportAnalytics.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            PDF
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      )}
      {isError && <p className="py-16 text-center text-body-sm text-accent-red">Failed to load analytics.</p>}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="Total clicks" value={data.total_clicks} />
            <MetricCard label="Clicks (7d)" value={data.clicks_last_7_days} />
            <MetricCard label="Published posts" value={data.published_posts} />
            <MetricCard label="Sites / Pages" value={`${data.total_sites} / ${data.total_pages}`} />
          </div>

          {!hasAnyClicks && (
            <div className="mb-6 rounded-lg border border-dashed border-border-default bg-bg-secondary/40 px-6 py-8 text-center">
              <MousePointerClick size={24} className="mx-auto mb-3 text-text-muted" />
              <p className="text-body-sm text-text-secondary">No clicks tracked yet.</p>
              <p className="mt-1 text-caption text-text-muted">
                Every generated post links back through a tracked redirect — clicks will show up here
                automatically once people click through.
              </p>
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <p className="mb-4 text-body-sm font-medium text-text-primary">Clicks over time</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(var(--chart-1))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="rgb(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-default))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'rgb(var(--text-muted))', fontSize: 11 }}
                      axisLine={{ stroke: 'rgb(var(--border-default))' }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: 'rgb(var(--text-muted))', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={28}
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
                      dataKey="clicks"
                      stroke="rgb(var(--chart-1))"
                      strokeWidth={2}
                      fill="url(#clicksGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <p className="mb-4 text-body-sm font-medium text-text-primary">Clicks by platform</p>
              {data.clicks_by_platform.length === 0 ? (
                <p className="text-caption text-text-muted">No data yet.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.clicks_by_platform.map((p) => ({
                        ...p,
                        label: PLATFORM_LABEL[p.platform] ?? p.platform,
                      }))}
                      layout="vertical"
                      margin={{ left: 8 }}
                    >
                      <XAxis type="number" hide allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        tick={{ fill: 'rgb(var(--text-secondary))', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'rgb(var(--bg-surface))',
                          border: '1px solid rgb(var(--border-default))',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        cursor={{ fill: 'rgb(var(--bg-tertiary))' }}
                      />
                      <Bar dataKey="clicks" fill="rgb(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <Card>
            <div className="border-b border-border-default p-5">
              <p className="text-body-sm font-medium text-text-primary">Top posts</p>
            </div>
            <div className="overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border-default bg-bg-secondary">
                    <th className="px-5 py-3 text-caption uppercase text-text-muted">Post</th>
                    <th className="px-5 py-3 text-caption uppercase text-text-muted">Platform</th>
                    <th className="px-5 py-3 text-caption uppercase text-text-muted">Status</th>
                    <th className="px-5 py-3 text-caption uppercase text-text-muted">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_posts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-body-sm text-text-secondary">
                        <BarChart3 size={22} className="mx-auto mb-2 text-text-muted" />
                        No posts yet.
                      </td>
                    </tr>
                  )}
                  {data.top_posts.map((post) => (
                    <tr key={post.id} className="border-b border-border-default last:border-0">
                      <td className="max-w-xs px-5 py-3">
                        <p className="truncate text-body-sm text-text-primary">
                          {post.title ?? 'Untitled post'}
                        </p>
                        {post.site_name && (
                          <p className="truncate text-caption text-text-muted">{post.site_name}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-body-sm text-text-secondary">
                        {PLATFORM_LABEL[post.platform] ?? post.platform}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={STATUS_VARIANT[post.status] ?? 'neutral'}>{post.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-body-sm font-medium text-text-primary">{post.clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
