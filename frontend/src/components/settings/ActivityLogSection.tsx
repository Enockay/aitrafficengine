import { useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

import { Select } from '@/components/ui/select'
import { useActivityLogs } from '@/hooks/useActivityLogs'
import type { ActivityLogEntry } from '@/types/activityLog'

const ENTITY_TYPES = [
  'site',
  'page',
  'post',
  'flyer',
  'schedule',
  'platform_account',
  'platform_credentials',
  'user',
]

const LIMIT = 20

function describe(entry: ActivityLogEntry) {
  const entity = entry.entity_type.replace(/_/g, ' ')
  return `${entry.action.replace(/_/g, ' ')} ${entity}`
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ActivityLogSection() {
  const [entityType, setEntityType] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useActivityLogs({
    page,
    limit: LIMIT,
    entity_type: entityType || undefined,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-body-sm font-medium text-text-primary">Activity log</p>
          <p className="text-caption text-text-muted">
            Audit trail of actions on your account — logins, content changes, and publications.
          </p>
        </div>
        <Select
          className="w-44"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, ' ')}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-default">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-default bg-bg-secondary">
              <th className="px-4 py-2.5 text-caption uppercase text-text-muted">Event</th>
              <th className="px-4 py-2.5 text-caption uppercase text-text-muted">IP</th>
              <th className="px-4 py-2.5 text-caption uppercase text-text-muted">Time</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center">
                  <Loader2 size={16} className="mx-auto animate-spin text-text-muted" />
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-body-sm text-accent-red">
                  Failed to load activity log.
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-body-sm text-text-secondary">
                  No activity yet.
                </td>
              </tr>
            )}
            {data?.items.map((entry) => (
              <tr key={entry.id} className="border-b border-border-default last:border-0">
                <td className="px-4 py-2.5 text-body-sm capitalize text-text-primary">{describe(entry)}</td>
                <td className="px-4 py-2.5 font-mono text-caption text-text-muted">{entry.ip_address ?? '—'}</td>
                <td className="px-4 py-2.5 text-caption text-text-muted">{formatTimestamp(entry.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > LIMIT && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-caption text-text-muted">
            Page {page} of {totalPages} · {data.total} events
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
    </div>
  )
}
