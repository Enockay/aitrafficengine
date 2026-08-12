import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Image as ImageIcon, Loader2, Plus } from 'lucide-react'

import { FlyerCard } from '@/components/flyers/FlyerCard'
import { FlyerDetailDialog } from '@/components/flyers/FlyerDetailDialog'
import { GenerateFlyerDialog } from '@/components/flyers/GenerateFlyerDialog'
import { Button } from '@/components/ui/button'
import { useDeleteFlyer, useFlyersQuery } from '@/hooks/useFlyers'
import { usePagesQuery } from '@/hooks/usePages'
import type { Flyer } from '@/types/flyer'

export default function Flyers() {
  const [generateOpen, setGenerateOpen] = useState(false)
  const [detailFlyer, setDetailFlyer] = useState<Flyer | null>(null)

  const { data: pagesData } = usePagesQuery({ limit: 100 })
  const pages = pagesData?.items ?? []
  const pageById = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages])

  const { data, isLoading, isError } = useFlyersQuery({})
  const flyers = data?.items ?? []
  const deleteFlyer = useDeleteFlyer()

  async function handleDelete(flyer: Flyer) {
    if (!confirm('Delete this flyer?')) return
    try {
      await deleteFlyer.mutateAsync(flyer.id)
      toast.success('Flyer deleted')
      if (detailFlyer?.id === flyer.id) setDetailFlyer(null)
    } catch {
      toast.error('Failed to delete flyer')
    }
  }

  const activePage = detailFlyer ? pageById.get(detailFlyer.page_id) : undefined

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-h1 text-text-primary">Flyers</h1>
        <Button onClick={() => setGenerateOpen(true)} disabled={pages.length === 0}>
          <Plus size={16} />
          Generate flyer
        </Button>
      </div>

      {pages.length === 0 && !isLoading && (
        <p className="mb-4 text-body-sm text-text-secondary">
          Add and crawl a page first before generating flyers.
        </p>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      )}
      {isError && <p className="py-16 text-center text-body-sm text-accent-red">Failed to load flyers.</p>}
      {!isLoading && !isError && flyers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default py-16 text-center">
          <ImageIcon size={28} className="mb-3 text-text-muted" />
          <p className="text-body-sm text-text-secondary">No flyers yet.</p>
          <p className="mt-1 text-caption text-text-muted">Generate one from a crawled page to get started.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {flyers.map((flyer) => (
          <FlyerCard
            key={flyer.id}
            flyer={flyer}
            pageTitle={pageById.get(flyer.page_id)?.title ?? pageById.get(flyer.page_id)?.url}
            onView={() => setDetailFlyer(flyer)}
            onDelete={() => handleDelete(flyer)}
          />
        ))}
      </div>

      <GenerateFlyerDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        pages={pages}
        onGenerated={(flyer) => setDetailFlyer(flyer)}
      />
      <FlyerDetailDialog
        flyer={detailFlyer}
        pageTitle={activePage?.title ?? activePage?.url}
        onOpenChange={(open) => !open && setDetailFlyer(null)}
        onDelete={handleDelete}
      />
    </div>
  )
}
