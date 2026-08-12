import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { useAdminSchedulesQuery } from '@/hooks/useAdminSchedules'

const PLATFORM_LABEL: Record<string, string> = {
  twitter: 'X / Twitter',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  tumblr: 'Tumblr',
  pinterest: 'Pinterest',
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  pending: 'warning',
  published: 'success',
  failed: 'error',
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminSchedules() {
  const [statusFilter, setStatusFilter] = useState('')
  const { data, isLoading, isError } = useAdminSchedulesQuery(statusFilter || undefined)
  const schedules = data?.items ?? []

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-text-primary">All schedules</h1>
          {data && <p className="mt-0.5 text-caption text-text-muted">{data.total} total, across every user</p>}
        </div>
        <Select className="w-full sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="published">Published</option>
          <option value="failed">Failed</option>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-border-default bg-bg-secondary">
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">Post</th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">Owner</th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                Platform
              </th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                Scheduled for
              </th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">Status</th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">Error</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-body-sm text-text-secondary">
                  <Loader2 size={18} className="mx-auto animate-spin" />
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-body-sm text-accent-red">
                  Failed to load schedules.
                </td>
              </tr>
            )}
            {!isLoading && !isError && schedules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-body-sm text-text-secondary">
                  No schedules found.
                </td>
              </tr>
            )}
            {schedules.map((schedule, index) => (
              <tr
                key={schedule.id}
                className={`border-b border-border-default last:border-0 ${
                  index % 2 === 1 ? 'bg-bg-secondary/30' : ''
                }`}
              >
                <td className="max-w-xs truncate px-4 py-3 text-body-sm text-text-primary">
                  {schedule.post_title ?? 'Untitled'}
                </td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">{schedule.owner_email}</td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">
                  {PLATFORM_LABEL[schedule.platform] ?? schedule.platform}
                </td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">
                  {formatDateTime(schedule.scheduled_at)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[schedule.status] ?? 'neutral'}>{schedule.status}</Badge>
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-caption text-accent-red">
                  {schedule.last_error ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
