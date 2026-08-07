import { useState } from 'react'
import { toast } from 'sonner'
import { Globe, Loader2, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { PageIntro } from '@/components/layout/PageIntro'
import { SiteDetailDrawer } from '@/components/sites/SiteDetailDrawer'
import { SiteFormDialog } from '@/components/sites/SiteFormDialog'
import { useCrawlSite, useDeleteSite, useSitesQuery } from '@/hooks/useSites'
import type { Site } from '@/types/site'

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function SiteIcon({ imageUrl }: { imageUrl: string | null }) {
  const [failed, setFailed] = useState(false)

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt=""
        onError={() => setFailed(true)}
        className="h-8 w-8 shrink-0 rounded-md object-cover"
      />
    )
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-tertiary text-text-muted transition-colors group-hover:bg-accent-red/10 group-hover:text-accent-red">
      <Globe size={14} />
    </div>
  )
}

export default function Sites() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [detailSite, setDetailSite] = useState<Site | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [crawlingId, setCrawlingId] = useState<string | null>(null)

  const { data, isLoading, isError } = useSitesQuery({
    search: search || undefined,
    status: statusFilter || undefined,
  })
  const deleteSite = useDeleteSite()
  const crawlSite = useCrawlSite()

  function openAddDialog() {
    setEditingSite(null)
    setFormOpen(true)
  }

  function openEditDialog(site: Site) {
    setEditingSite(site)
    setFormOpen(true)
  }

  async function handleDelete(site: Site) {
    if (!confirm(`Delete "${site.name}"? This cannot be undone.`)) return
    setDeletingId(site.id)
    try {
      await deleteSite.mutateAsync(site.id)
      toast.success('Site deleted')
      if (detailSite?.id === site.id) setDetailSite(null)
    } catch {
      toast.error('Failed to delete site')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleCrawl(site: Site) {
    setCrawlingId(site.id)
    try {
      const result = await crawlSite.mutateAsync(site.id)
      if (result.failed > 0 && result.crawled === 0) {
        toast.error(result.message)
      } else {
        toast.success(result.message)
      }
    } catch {
      toast.error('Failed to start crawl')
    } finally {
      setCrawlingId(null)
    }
  }

  const sites = data?.items ?? []
  const activeCount = sites.filter((s) => s.is_active).length

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-text-primary">Sites</h1>
          {!isLoading && !isError && sites.length > 0 && (
            <p className="mt-0.5 text-caption text-text-muted">
              {sites.length} site{sites.length === 1 ? '' : 's'} · {activeCount} active
            </p>
          )}
        </div>
        <Button onClick={openAddDialog}>
          <Plus size={16} />
          Add site
        </Button>
      </div>

      <PageIntro
        storageKey="sites"
        description="Sites are the websites you're promoting. Add one, then crawl it — the crawler pulls in pages you can turn into posts."
      />

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
              <th className="px-4 py-3 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                Actions
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
                  No sites yet.{' '}
                  <button onClick={openAddDialog} className="text-accent-red hover:underline">
                    Add your first site
                  </button>
                  .
                </td>
              </tr>
            )}
            {sites.map((site, index) => {
              const isCrawling = crawlingId === site.id
              return (
                <tr
                  key={site.id}
                  onClick={() => setDetailSite(site)}
                  className={`group cursor-pointer border-b border-border-default transition-colors last:border-0 hover:bg-bg-tertiary/60 ${
                    index % 2 === 1 ? 'bg-bg-secondary/30' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <SiteIcon imageUrl={site.image_url} />
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-medium text-text-primary">{site.name}</p>
                        <p className="truncate text-caption text-text-muted">{site.domain}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-body-sm tabular-nums text-text-secondary">
                    {site.pages_count}
                  </td>
                  <td className="px-4 py-3 text-right text-body-sm tabular-nums text-text-secondary">
                    {site.posts_count}
                  </td>
                  <td
                    className={`px-4 py-3 text-right text-body-sm tabular-nums ${
                      site.total_clicks > 0 ? 'font-medium text-text-primary' : 'text-text-muted'
                    }`}
                  >
                    {site.total_clicks}
                  </td>
                  <td className="px-4 py-3">
                    {isCrawling ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-yellow/10 px-2.5 py-0.5 text-caption font-medium text-accent-yellow">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-yellow" />
                        Crawling…
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium ${
                          site.is_active ? 'bg-accent-green/10 text-accent-green' : 'bg-bg-tertiary text-text-secondary'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            site.is_active ? 'bg-accent-green' : 'bg-text-muted'
                          }`}
                        />
                        {site.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-body-sm text-text-secondary">{formatDate(site.last_crawled_at)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Edit"
                        onClick={() => openEditDialog(site)}
                        className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        title="Crawl now"
                        onClick={() => handleCrawl(site)}
                        disabled={isCrawling}
                        className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-accent-blue disabled:opacity-50"
                      >
                        {isCrawling ? (
                          <Loader2 size={15} className="animate-spin text-accent-blue" />
                        ) : (
                          <Play size={15} />
                        )}
                      </button>
                      <button
                        title="Delete"
                        onClick={() => handleDelete(site)}
                        disabled={deletingId === site.id}
                        className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-accent-red disabled:opacity-50"
                      >
                        {deletingId === site.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <SiteFormDialog open={formOpen} onOpenChange={setFormOpen} site={editingSite} />
      {detailSite && <SiteDetailDrawer site={detailSite} onClose={() => setDetailSite(null)} />}
    </div>
  )
}
