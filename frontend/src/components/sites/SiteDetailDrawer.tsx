import { X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { useSitePagesQuery } from '@/hooks/useSites'
import type { Site } from '@/types/site'

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function SiteDetailDrawer({ site, onClose }: { site: Site; onClose: () => void }) {
  const { data: pages, isLoading } = useSitePagesQuery(site.id)

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-border-default bg-bg-secondary shadow-lg">
        <div className="flex items-center justify-between border-b border-border-default p-6">
          <div>
            <h2 className="text-h3 text-text-primary">{site.name}</h2>
            <a
              href={`https://${site.domain}`}
              target="_blank"
              rel="noreferrer"
              className="text-body-sm text-accent-blue hover:underline"
            >
              {site.domain}
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {site.description && <p className="mb-6 text-body text-text-secondary">{site.description}</p>}

          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-border-default p-3 text-center">
              <p className="text-metric-lg text-text-primary">{site.pages_count}</p>
              <p className="text-metric-label uppercase text-text-muted">Pages</p>
            </div>
            <div className="rounded-md border border-border-default p-3 text-center">
              <p className="text-metric-lg text-text-primary">{site.posts_count}</p>
              <p className="text-metric-label uppercase text-text-muted">Posts</p>
            </div>
            <div className="rounded-md border border-border-default p-3 text-center">
              <p className="text-metric-lg text-text-primary">{site.total_clicks}</p>
              <p className="text-metric-label uppercase text-text-muted">Clicks</p>
            </div>
          </div>

          <div className="mb-6 space-y-2 text-body-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Status</span>
              <Badge variant={site.is_active ? 'success' : 'neutral'}>
                {site.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Crawl frequency</span>
              <span className="capitalize text-text-primary">{site.crawl_frequency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Last crawled</span>
              <span className="text-text-primary">{formatDate(site.last_crawled_at)}</span>
            </div>
          </div>

          <h3 className="mb-3 text-h3 text-text-primary">Pages</h3>
          {isLoading && <p className="text-body-sm text-text-secondary">Loading pages...</p>}
          {!isLoading && pages?.items.length === 0 && (
            <p className="text-body-sm text-text-secondary">
              No pages yet. Pages appear here once the crawler ingests this site.
            </p>
          )}
          {!isLoading && pages && pages.items.length > 0 && (
            <ul className="space-y-2">
              {pages.items.map((p) => (
                <li key={p.id} className="rounded-md border border-border-default p-3">
                  <p className="truncate text-body-sm font-medium text-text-primary">{p.title ?? p.url}</p>
                  <p className="truncate text-caption text-text-muted">{p.url}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
