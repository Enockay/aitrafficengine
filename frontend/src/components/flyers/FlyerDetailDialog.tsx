import { Download, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Flyer } from '@/types/flyer'

interface FlyerDetailDialogProps {
  flyer: Flyer | null
  pageTitle?: string
  onOpenChange: (open: boolean) => void
  onDelete: (flyer: Flyer) => void
}

export function FlyerDetailDialog({ flyer, pageTitle, onOpenChange, onDelete }: FlyerDetailDialogProps) {
  return (
    <Dialog open={!!flyer} onOpenChange={onOpenChange}>
      {flyer && (
        <DialogContent className="max-h-[88vh] w-full max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{flyer.headline ?? 'Flyer'}</DialogTitle>
            {pageTitle && <p className="text-body-sm text-text-secondary">from {pageTitle}</p>}
          </DialogHeader>

          <div className="overflow-hidden rounded-lg border border-border-default bg-bg-tertiary">
            <img src={flyer.image_url} alt={flyer.headline ?? 'Flyer'} className="w-full" />
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border-default pt-4">
            <button
              type="button"
              onClick={() => onDelete(flyer)}
              className="flex items-center gap-1.5 text-body-sm text-text-muted hover:text-accent-red"
            >
              <Trash2 size={14} /> Delete
            </button>
            <Button asChild>
              <a href={flyer.image_url} download={`flyer-${flyer.id}.png`}>
                <Download size={16} />
                Download PNG
              </a>
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
