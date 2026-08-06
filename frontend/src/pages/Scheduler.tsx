import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarClock, Loader2, X } from 'lucide-react'

import { PageIntro } from '@/components/layout/PageIntro'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { useCancelSchedule, useSchedulesQuery } from '@/hooks/useSchedules'
import type { Schedule } from '@/types/schedule'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  pending: 'warning',
  published: 'success',
  failed: 'error',
}

const PLATFORM_LABEL: Record<string, string> = {
  twitter: 'X / Twitter',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function Scheduler() {
  const [statusFilter, setStatusFilter] = useState('')
  const { data, isLoading, isError } = useSchedulesQuery(statusFilter || undefined)
  const cancelSchedule = useCancelSchedule()

  const schedules = data?.items ?? []

  async function handleCancel(schedule: Schedule) {
    if (!confirm('Cancel this scheduled post?')) return
    try {
      await cancelSchedule.mutateAsync(schedule.id)
      toast.success('Schedule cancelled')
    } catch {
      toast.error('Failed to cancel schedule')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h1 text-text-primary">Scheduler</h1>
        <Select className="w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="published">Published</option>
          <option value="failed">Failed</option>
        </Select>
      </div>

      <PageIntro
        storageKey="scheduler"
        description="Everything you've scheduled shows up here and publishes automatically at its scheduled time via a background worker."
      />

      <div className="overflow-hidden rounded-lg border border-border-default">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-default bg-bg-secondary">
              <th className="px-4 py-3 text-caption uppercase text-text-muted">Post</th>
              <th className="px-4 py-3 text-caption uppercase text-text-muted">Platform</th>
              <th className="px-4 py-3 text-caption uppercase text-text-muted">Account</th>
              <th className="px-4 py-3 text-caption uppercase text-text-muted">Scheduled for</th>
              <th className="px-4 py-3 text-caption uppercase text-text-muted">Status</th>
              <th className="px-4 py-3 text-caption uppercase text-text-muted">Actions</th>
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
                  Failed to load the schedule queue.
                </td>
              </tr>
            )}
            {!isLoading && !isError && schedules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-body-sm text-text-secondary">
                  <CalendarClock size={24} className="mx-auto mb-3 text-text-muted" />
                  No scheduled posts. Approve a post and schedule it from the Posts tab.
                </td>
              </tr>
            )}
            {schedules.map((schedule) => (
              <tr key={schedule.id} className="border-b border-border-default last:border-0">
                <td className="px-4 py-3">
                  <p className="max-w-xs truncate text-body-sm text-text-primary">
                    {schedule.post_title ?? 'Untitled post'}
                  </p>
                  {schedule.status === 'failed' && schedule.last_error && (
                    <p className="mt-0.5 max-w-xs truncate text-caption text-accent-red" title={schedule.last_error}>
                      {schedule.last_error}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">
                  {PLATFORM_LABEL[schedule.platform] ?? schedule.platform}
                </td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">
                  {schedule.platform_account_label ? `@${schedule.platform_account_label}` : '—'}
                </td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">
                  {formatDateTime(schedule.scheduled_at)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[schedule.status] ?? 'neutral'}>{schedule.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  {schedule.status === 'pending' && (
                    <button
                      type="button"
                      title="Cancel"
                      onClick={() => handleCancel(schedule)}
                      className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-accent-red"
                    >
                      <X size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
