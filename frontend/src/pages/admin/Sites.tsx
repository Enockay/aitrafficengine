import { useState } from 'react'
import { Globe, Loader2, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useAdminSitesQuery } from '@/hooks/useAdminSites'

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminSites() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('')

  const { data, isLoading, isError } = useAdminSitesQuery({
    search: search || undefined,
    status: statusFilter || undefined,
  })
  const sites = data?.items ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-text-primary">All sites</h1>
        {data && <p className="mt-0.5 text-caption text-text-muted">{data.total} total, across every user</p>}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Search sites..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | '')}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-border-default bg-bg-secondary">
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">Site</th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">Owner</th>
              <th className="px-4 py-3 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                Pages
              </th>
              <th className="px-4 py-3 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                Posts
              </th>
              <th className="px-4 py-3 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                Clicks
              </th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">Status</th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                Last crawled
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-body-sm text-text-secondary">
                  <Loader2 size={18} className="mx-auto animate-spin" />
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-body-sm text-accent-red">
                  Failed to load sites.
                </td>
              </tr>
            )}
            {!isLoading && !isError && sites.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-body-sm text-text-secondary">
                  No sites found.
                </td>
              </tr>
            )}
            {sites.map((site, index) => (
              <tr
                key={site.id}
                className={`border-b border-border-default last:border-0 ${
                  index % 2 === 1 ? 'bg-bg-secondary/30' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-tertiary text-text-muted">
                      <Globe size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-medium text-text-primary">{site.name}</p>
                      <p className="truncate text-caption text-text-muted">{site.domain}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">{site.owner_email}</td>
                <td className="px-4 py-3 text-right text-body-sm tabular-nums text-text-secondary">
                  {site.pages_count}
                </td>
                <td className="px-4 py-3 text-right text-body-sm tabular-nums text-text-secondary">
                  {site.posts_count}
                </td>
                <td className="px-4 py-3 text-right text-body-sm tabular-nums text-text-secondary">
                  {site.total_clicks}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={site.is_active ? 'success' : 'neutral'}>
                    {site.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">{formatDate(site.last_crawled_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
