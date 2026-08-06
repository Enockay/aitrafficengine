import { ExternalLink } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Page } from '@/types/page'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  crawled: 'success',
  pending: 'warning',
  failed: 'error',
}

export function PageDetailDialog({
  page,
  onOpenChange,
}: {
  page: Page | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!page} onOpenChange={onOpenChange}>
      {page && (
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>{page.title ?? 'Untitled page'}</DialogTitle>
              <Badge variant={STATUS_VARIANT[page.status] ?? 'neutral'}>{page.status}</Badge>
            </div>
            <a
              href={page.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-body-sm text-accent-blue hover:underline"
            >
              {page.url}
              <ExternalLink size={12} />
            </a>
          </DialogHeader>

          {page.hero_image_url && (
            <img src={page.hero_image_url} alt="" className="mb-4 max-h-48 w-full rounded-md object-cover" />
          )}

          {page.summary && (
            <div className="mb-4">
              <h3 className="mb-1 text-caption uppercase text-text-muted">Summary</h3>
              <p className="text-body-sm text-text-secondary">{page.summary}</p>
            </div>
          )}

          {page.key_points && page.key_points.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-caption uppercase text-text-muted">Key points</h3>
              <ul className="list-inside list-disc space-y-1">
                {page.key_points.map((point) => (
                  <li key={point} className="text-body-sm text-text-secondary">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {page.status === 'failed' && (
            <p className="text-body-sm text-accent-red">
              The crawler could not fetch this page. It may be unreachable or disallow crawling via robots.txt.
            </p>
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}
