import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Check, Circle, Loader2, Sparkles, Wand2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useGenerateFlyer, useGenerateFlyerPrompt } from '@/hooks/useFlyers'
import { getErrorMessage } from '@/lib/errors'
import type { Page } from '@/types/page'
import type { Flyer } from '@/types/flyer'

interface GenerateFlyerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pages: Page[]
  defaultPageId?: string
  onGenerated: (flyer: Flyer) => void
}

type Stage = 'idle' | 'prompt' | 'image' | 'done'

const STEPS: { key: Stage; label: string }[] = [
  { key: 'prompt', label: 'Writing creative prompt with Claude' },
  { key: 'image', label: 'Generating background with Stability AI' },
  { key: 'done', label: 'Composing flyer' },
]

function stepStatus(step: Stage, current: Stage): 'pending' | 'active' | 'done' {
  const order: Stage[] = ['prompt', 'image', 'done']
  const stepIndex = order.indexOf(step)
  const currentIndex = order.indexOf(current)
  if (currentIndex > stepIndex) return 'done'
  if (currentIndex === stepIndex) return 'active'
  return 'pending'
}

export function GenerateFlyerDialog({
  open,
  onOpenChange,
  pages,
  defaultPageId,
  onGenerated,
}: GenerateFlyerDialogProps) {
  const [pageId, setPageId] = useState(defaultPageId ?? '')
  const [headline, setHeadline] = useState('')
  const [subheadline, setSubheadline] = useState('')
  const [ctaText, setCtaText] = useState('Read More')
  const [imagePrompt, setImagePrompt] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [usedPrompt, setUsedPrompt] = useState('')
  const generateFlyerPrompt = useGenerateFlyerPrompt()
  const generateFlyer = useGenerateFlyer()

  const crawledPages = pages.filter((p) => p.status === 'crawled')
  const isBusy = stage !== 'idle' && stage !== 'done'

  function resetForm() {
    setHeadline('')
    setSubheadline('')
    setCtaText('Read More')
    setImagePrompt('')
    setStage('idle')
    setUsedPrompt('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      let prompt = imagePrompt.trim()
      if (!prompt) {
        setStage('prompt')
        prompt = await generateFlyerPrompt.mutateAsync(pageId)
      }
      setUsedPrompt(prompt)

      setStage('image')
      const flyer = await generateFlyer.mutateAsync({
        page_id: pageId,
        headline: headline || undefined,
        subheadline: subheadline || undefined,
        cta_text: ctaText || undefined,
        image_prompt: prompt,
      })

      setStage('done')
      toast.success('Flyer generated')
      resetForm()
      onOpenChange(false)
      onGenerated(flyer)
    } catch (error) {
      setStage('idle')
      toast.error(getErrorMessage(error, 'Failed to generate flyer'))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate flyer</DialogTitle>
          <DialogDescription>
            Claude writes a unique background prompt from the page's content, then Stability AI paints
            it — every flyer gets a different image.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flyer-page">Page</Label>
            <Select
              id="flyer-page"
              required
              disabled={isBusy}
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
            >
              <option value="" disabled>
                Select a page
              </option>
              {crawledPages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title ?? page.url}
                </option>
              ))}
            </Select>
            {crawledPages.length === 0 && (
              <p className="text-caption text-text-muted">No crawled pages available yet.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="flyer-headline">Headline (optional)</Label>
            <Input
              id="flyer-headline"
              disabled={isBusy}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Defaults to the page title"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flyer-subheadline">Subheadline (optional)</Label>
            <Input
              id="flyer-subheadline"
              disabled={isBusy}
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              placeholder="Defaults to the page summary"
              maxLength={300}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flyer-cta">Call to action</Label>
            <Input
              id="flyer-cta"
              disabled={isBusy}
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="flyer-image-prompt" className="flex items-center gap-1.5">
              <Wand2 size={13} /> Custom image prompt (optional)
            </Label>
            <Input
              id="flyer-image-prompt"
              disabled={isBusy}
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Leave blank and Claude writes a unique one automatically"
              maxLength={500}
            />
          </div>

          {stage !== 'idle' && (
            <div className="space-y-3 rounded-md border border-border-default bg-bg-surface p-3">
              <ul className="space-y-2">
                {STEPS.map((step) => {
                  const state = stepStatus(step.key, stage)
                  return (
                    <li key={step.key} className="flex items-center gap-2.5">
                      {state === 'done' && <Check size={14} className="shrink-0 text-accent-green" />}
                      {state === 'active' && (
                        <Loader2 size={14} className="shrink-0 animate-spin text-accent-red" />
                      )}
                      {state === 'pending' && (
                        <Circle size={14} className="shrink-0 text-text-muted" />
                      )}
                      <span
                        className={`text-body-sm ${
                          state === 'pending' ? 'text-text-muted' : 'text-text-primary'
                        }`}
                      >
                        {step.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {usedPrompt && (
                <div className="rounded-md bg-bg-primary p-2.5">
                  <p className="mb-1 text-caption uppercase text-text-muted">Image prompt</p>
                  <p className="text-caption leading-relaxed text-text-secondary">{usedPrompt}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isBusy || !pageId}>
              {isBusy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
