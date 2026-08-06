import { Trash2 } from 'lucide-react'

import type { Flyer } from '@/types/flyer'

interface FlyerCardProps {
  flyer: Flyer
  pageTitle?: string
  onView: () => void
  onDelete: () => void
}

export function FlyerCard({ flyer, pageTitle, onView, onDelete }: FlyerCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-bg-secondary transition-colors hover:bg-bg-tertiary/40">
      <button type="button" onClick={onView} className="block w-full text-left">
        <div className="aspect-[1200/630] w-full overflow-hidden bg-bg-tertiary">
          <img src={flyer.image_url} alt={flyer.headline ?? 'Flyer'} className="h-full w-full object-cover" />
        </div>
        <div className="p-4">
          {pageTitle && <p className="mb-1 truncate text-caption uppercase text-text-muted">{pageTitle}</p>}
          <p className="truncate text-body-sm font-medium text-text-primary">
            {flyer.headline ?? 'Untitled flyer'}
          </p>
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-border-default px-4 py-2.5">
        <span className="text-caption text-text-muted">{flyer.template_name}</span>
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
  )
}
