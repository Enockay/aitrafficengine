import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { ChevronLeft, ChevronRight, FileText, Loader2, Plus, Search } from 'lucide-react'

import { PageIntro } from '@/components/layout/PageIntro'
import { AddPageDialog } from '@/components/pages/AddPageDialog'
import { PageCard } from '@/components/pages/PageCard'
import { PageDetailDialog } from '@/components/pages/PageDetailDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useDeletePage, useGeneratePosts, usePagesQuery } from '@/hooks/usePages'
import { useSitesQuery } from '@/hooks/useSites'
import type { Page } from '@/types/page'

const PAGE_LIMIT = 20

export default function Pages() {
  const [search, setSearch] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)
  const [detailPage, setDetailPage] = useState<Page | null>(null)

  const { data: sitesData } = useSitesQuery({ limit: 100 })
  const sites = sitesData?.items ?? []
  const siteNameById = useMemo(() => new Map(sites.map((s) => [s.id, s.name])), [sites])

  const { data, isLoading, isError } = usePagesQuery({
    search: search || undefined,
    site_id: siteFilter || undefined,
    status: statusFilter || undefined,
    page,
    limit: PAGE_LIMIT,
  })
  const deletePage = useDeletePage()
  const generatePosts = useGeneratePosts()

  const pages = data?.items ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_LIMIT)) : 1

  function updateFilter(setter: (value: string) => void) {
    return (value: string) => {
      setter(value)
      setPage(1)
    }
  }

  async function handleDelete(page: Page) {
    if (!confirm('Delete this page?')) return
    try {
      await deletePage.mutateAsync(page.id)
      toast.success('Page deleted')
      if (detailPage?.id === page.id) setDetailPage(null)
    } catch {
      toast.error('Failed to delete page')
    }
  }

  async function handleGenerate(page: Page) {
    try {
      await generatePosts.mutateAsync({ id: page.id })
      toast.success('Post generated', { description: 'View it in the Posts tab.' })
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.status === 501
          ? 'AI post generation ships later in Phase 2 — not available yet.'
          : 'Failed to generate posts'
      toast.error(message)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h1 text-text-primary">Pages</h1>
        <Button onClick={() => setAddOpen(true)} disabled={sites.length === 0}>
          <Plus size={16} />
          Add page
        </Button>
      </div>

      <PageIntro
        storageKey="pages"
        description="These are the pages pulled from your sites. Pick one and generate a post — Claude writes platform-native copy with a tracked link back to it."
      />

      {sites.length === 0 && !isLoading && (
        <p className="mb-4 text-body-sm text-text-secondary">Add a site first before adding pages to crawl.</p>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <Input
            placeholder="Search pages..."
            className="pl-9"
            value={search}
            onChange={(e) => updateFilter(setSearch)(e.target.value)}
          />
        </div>
        <Select className="w-48" value={siteFilter} onChange={(e) => updateFilter(setSiteFilter)(e.target.value)}>
          <option value="">All sites</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </Select>
        <Select className="w-40" value={statusFilter} onChange={(e) => updateFilter(setStatusFilter)(e.target.value)}>
          <option value="">All statuses</option>
          <option value="crawled">Crawled</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </Select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      )}
      {isError && <p className="py-16 text-center text-body-sm text-accent-red">Failed to load pages.</p>}
      {!isLoading && !isError && pages.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default py-16 text-center">
          <FileText size={28} className="mb-3 text-text-muted" />
          <p className="text-body-sm text-text-secondary">No pages yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pages.map((page) => (
          <PageCard
            key={page.id}
            page={page}
            siteName={siteNameById.get(page.site_id)}
            onView={() => setDetailPage(page)}
            onGenerate={() => handleGenerate(page)}
            onDelete={() => handleDelete(page)}
          />
        ))}
      </div>

      {data && data.total > PAGE_LIMIT && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-caption text-text-muted">
            Page {page} of {totalPages} · {data.total} pages
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

      <AddPageDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        sites={sites}
        defaultSiteId={siteFilter || undefined}
      />
      <PageDetailDialog page={detailPage} onOpenChange={(open) => !open && setDetailPage(null)} />
    </div>
  )
}
