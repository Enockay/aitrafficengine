import { FileText, Sparkles, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { Page } from '@/types/page'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  crawled: 'success',
  pending: 'warning',
  failed: 'error',
}

interface PageCardProps {
  page: Page
  siteName?: string
  onView: () => void
  onGenerate: () => void
  onDelete: () => void
}

export function PageCard({ page, siteName, onView, onGenerate, onDelete }: PageCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-bg-secondary transition-colors hover:bg-bg-tertiary/40">
      <button type="button" onClick={onView} className="block w-full text-left">
        <div className="flex h-32 items-center justify-center bg-bg-tertiary">
          {page.hero_image_url ? (
            <img src={page.hero_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <FileText size={28} className="text-text-muted" />
          )}
        </div>
        <div className="p-4">
          {siteName && <p className="mb-1 text-caption uppercase text-text-muted">{siteName}</p>}
          <p className="truncate text-body-sm font-medium text-text-primary">{page.title ?? page.url}</p>
          <p className="mt-0.5 truncate text-caption text-text-muted">{page.url}</p>
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-border-default px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[page.status] ?? 'neutral'}>{page.status}</Badge>
          <span className="text-caption text-text-muted">{page.posts_count} posts</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Generate posts"
            onClick={onGenerate}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-accent-red"
          >
            <Sparkles size={14} />
          </button>
          <button
            type="button"
            title="Delete"
            onClick={onDelete}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-accent-red"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
