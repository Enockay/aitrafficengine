import { toast } from 'sonner'
import { Loader2, RefreshCw } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAvailableTrends, useFetchTrendsNow, useTrendFetchLogs } from '@/hooks/useTrends'

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function TrendsSection() {
  const { data: logs, isLoading: logsLoading, isError: logsError } = useTrendFetchLogs()
  const { data: trends, isLoading: trendsLoading, isError: trendsError } = useAvailableTrends()
  const fetchNow = useFetchTrendsNow()

  async function handleFetchNow() {
    try {
      const log = await fetchNow.mutateAsync()
      if (log.success) {
        toast.success(`Fetched ${log.trend_count} trend(s)`)
      } else {
        toast.error('Trend fetch failed', { description: log.error_detail ?? undefined })
      }
    } catch {
      toast.error('Failed to trigger trend fetch')
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-body-sm font-medium text-text-primary">Trending topics</p>
          <p className="text-caption text-text-muted">
            Fetched automatically ~10x/day from X and used to make Twitter post generation trend-aware (only
            when genuinely relevant, capped at 2 posts per trend). Admin-only — this calls X's metered trends
            endpoint.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleFetchNow} disabled={fetchNow.isPending}>
          {fetchNow.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Fetch now
        </Button>
      </div>

      <div className="mb-2 text-caption font-medium uppercase text-text-muted">Recent fetch calls</div>
      <div className="mb-5 overflow-hidden rounded-lg border border-border-default">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-default bg-bg-secondary">
              <th className="px-4 py-2.5 text-caption uppercase text-text-muted">Status</th>
              <th className="px-4 py-2.5 text-caption uppercase text-text-muted">Result</th>
              <th className="px-4 py-2.5 text-caption uppercase text-text-muted">Time</th>
            </tr>
          </thead>
          <tbody>
            {logsLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center">
                  <Loader2 size={16} className="mx-auto animate-spin text-text-muted" />
                </td>
              </tr>
            )}
            {logsError && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-body-sm text-accent-red">
                  Failed to load fetch logs.
                </td>
              </tr>
            )}
            {!logsLoading && !logsError && logs?.items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-body-sm text-text-secondary">
                  No fetches yet.
                </td>
              </tr>
            )}
            {logs?.items.map((log) => (
              <tr key={log.id} className="border-b border-border-default last:border-0">
                <td className="px-4 py-2.5">
                  <Badge variant={log.success ? 'success' : 'error'}>
                    {log.success ? 'Success' : `Failed${log.status_code ? ` (${log.status_code})` : ''}`}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-body-sm text-text-secondary">
                  {log.success ? `${log.trend_count} trend(s)` : (log.error_detail ?? 'Unknown error')}
                </td>
                <td className="px-4 py-2.5 text-caption text-text-muted">{formatTimestamp(log.requested_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-2 text-caption font-medium uppercase text-text-muted">Available trends</div>
      <div className="overflow-hidden rounded-lg border border-border-default">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-default bg-bg-secondary">
              <th className="px-4 py-2.5 text-caption uppercase text-text-muted">Trend</th>
              <th className="px-4 py-2.5 text-caption uppercase text-text-muted">Used</th>
              <th className="px-4 py-2.5 text-caption uppercase text-text-muted">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {trendsLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center">
                  <Loader2 size={16} className="mx-auto animate-spin text-text-muted" />
                </td>
              </tr>
            )}
            {trendsError && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-body-sm text-accent-red">
                  Failed to load trends.
                </td>
              </tr>
            )}
            {!trendsLoading && !trendsError && trends?.items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-body-sm text-text-secondary">
                  No trends stored yet — trigger a fetch above once credits are available.
                </td>
              </tr>
            )}
            {trends?.items.map((trend) => (
              <tr key={trend.id} className="border-b border-border-default last:border-0">
                <td className="px-4 py-2.5 text-body-sm text-text-primary">{trend.name}</td>
                <td className="px-4 py-2.5 text-body-sm text-text-secondary">{trend.times_used} / 2</td>
                <td className="px-4 py-2.5 text-caption text-text-muted">{formatTimestamp(trend.fetched_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
