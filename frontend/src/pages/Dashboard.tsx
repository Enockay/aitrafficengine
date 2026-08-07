import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Send,
  XCircle,
} from 'lucide-react'

import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard'
import { PipelineProgress, type PipelineStep } from '@/components/dashboard/PipelineProgress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardOverview } from '@/hooks/useDashboard'
import { usePagesQuery } from '@/hooks/usePages'
import { useSitesQuery } from '@/hooks/useSites'

const PLATFORM_LABEL: Record<string, string> = {
  twitter: 'X / Twitter',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  // Tumblr and Pinterest intentionally omitted from this dashboard's traffic_by_day
  // chart — that series is keyed by platform on the backend (services/dashboard) and
  // extending it is a separate change; PLATFORM_LABEL here still covers them for the
  // top-posts list below, which just needs a display label.
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

function timeAgo(value: string) {
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, isLoading, isError } = useDashboardOverview()
  const { data: sitesData } = useSitesQuery({ limit: 1 })
  const { data: crawledPagesData } = usePagesQuery({ status: 'crawled', limit: 1 })

  const chartData = data?.traffic_by_day.map((d) => ({ ...d, label: formatShortDate(d.date) })) ?? []

  const pipelineSteps: PipelineStep[] = data
    ? [
        {
          key: 'sites',
          label: 'Add a site',
          hint: 'The website you want to promote.',
          done: (sitesData?.total ?? 0) > 0,
          to: '/sites',
        },
        {
          key: 'pages',
          label: 'Crawl pages',
          hint: 'Pulls in content the AI can turn into posts.',
          done: (crawledPagesData?.total ?? 0) > 0,
          to: '/pages',
        },
        {
          key: 'posts',
          label: 'Generate posts',
          hint: 'AI drafts platform-native copy with a tracked link.',
          done: data.total_posts.value > 0,
          to: '/posts',
        },
        {
          key: 'platforms',
          label: 'Connect a platform',
          hint: 'Required before any post can go out.',
          done: data.connected_platforms.value > 0,
          to: '/platforms',
        },
        {
          key: 'publish',
          label: 'Schedule or publish',
          hint: 'Sends the post live and starts tracking clicks.',
          done: data.active_schedules.value > 0 || data.platform_health.some((p) => p.last_publish_at),
          to: '/posts',
        },
      ]
    : []

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h1 text-text-primary">
          Welcome back{user ? `, ${user.full_name.split(' ')[0]}` : ''}
        </h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/sites">
              <Globe size={14} /> Add site
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/posts">
              <Send size={14} /> Create post
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/scheduler">
              <CalendarClock size={14} /> View queue
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/analytics">
              <BarChart3 size={14} /> Analytics
            </Link>
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      )}
      {isError && <p className="py-16 text-center text-body-sm text-accent-red">Failed to load dashboard.</p>}

      {data && (
        <>
          <PipelineProgress steps={pipelineSteps} />

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <DashboardMetricCard label="Total posts" metric={data.total_posts} />
            <DashboardMetricCard label="Total clicks" metric={data.total_clicks} />
            <DashboardMetricCard label="Active schedules" metric={data.active_schedules} />
            <DashboardMetricCard label="Connected platforms" metric={data.connected_platforms} />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <p className="mb-4 text-body-sm font-medium text-text-primary">Traffic overview (30 days)</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="twitterGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(var(--chart-1))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="rgb(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="linkedinGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(var(--chart-2))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="rgb(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="redditGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(var(--chart-3))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="rgb(var(--chart-3))" stopOpacity={0} />
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
                      dataKey="twitter"
                      name="X / Twitter"
                      stackId="1"
                      stroke="rgb(var(--chart-1))"
                      strokeWidth={1.5}
                      fill="url(#twitterGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="linkedin"
                      name="LinkedIn"
                      stackId="1"
                      stroke="rgb(var(--chart-2))"
                      strokeWidth={1.5}
                      fill="url(#linkedinGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="reddit"
                      name="Reddit"
                      stackId="1"
                      stroke="rgb(var(--chart-3))"
                      strokeWidth={1.5}
                      fill="url(#redditGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="space-y-3">
              <p className="text-body-sm font-medium text-text-primary">Platform health</p>
              {data.platform_health.map((p) => (
                <Card key={p.platform} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm font-medium text-text-primary">
                      {PLATFORM_LABEL[p.platform] ?? p.platform}
                    </span>
                    {p.connected ? (
                      <span className="flex items-center gap-1 text-caption text-accent-green">
                        <CheckCircle2 size={13} /> Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-caption text-text-muted">
                        <XCircle size={13} /> Not connected
                      </span>
                    )}
                  </div>
                  {p.connected && (
                    <div className="mt-1.5 space-y-0.5">
                      {p.account_handle && (
                        <p className="text-caption text-text-muted">@{p.account_handle}</p>
                      )}
                      <p className="flex items-center gap-1 text-caption text-text-muted">
                        <Clock size={11} />
                        {p.last_publish_at ? `Last publish ${timeAgo(p.last_publish_at)}` : 'No publishes yet'}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <div className="border-b border-border-default p-5">
                <p className="text-body-sm font-medium text-text-primary">Top performing posts</p>
              </div>
              {data.top_posts.length === 0 ? (
                <p className="p-5 text-body-sm text-text-secondary">No posts yet.</p>
              ) : (
                <ul className="divide-y divide-border-default">
                  {data.top_posts.map((post) => (
                    <li key={post.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm text-text-primary">
                          {post.title ?? 'Untitled post'}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-caption text-text-muted">
                            {PLATFORM_LABEL[post.platform] ?? post.platform}
                          </span>
                          <Badge variant={STATUS_VARIANT[post.status] ?? 'neutral'}>{post.status}</Badge>
                        </div>
                      </div>
                      <p className="shrink-0 text-body-sm font-medium text-text-primary">{post.clicks} clicks</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="border-b border-border-default p-5">
                <p className="text-body-sm font-medium text-text-primary">Recent activity</p>
              </div>
              {data.recent_activity.length === 0 ? (
                <p className="p-5 text-body-sm text-text-secondary">No activity yet.</p>
              ) : (
                <ul className="divide-y divide-border-default">
                  {data.recent_activity.map((event, i) => (
                    <li key={i} className="p-4">
                      <p className="text-body-sm text-text-primary">{event.description}</p>
                      <p className="mt-0.5 text-caption text-text-muted">{timeAgo(event.timestamp)}</p>
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
