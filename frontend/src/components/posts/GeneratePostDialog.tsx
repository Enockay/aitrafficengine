import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { Loader2, Sparkles } from 'lucide-react'

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
import { useGeneratePosts, useGenerateVariants } from '@/hooks/usePages'
import type { Page } from '@/types/page'
import type { Post } from '@/types/post'

const PLATFORM_OPTIONS = [
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'tumblr', label: 'Tumblr' },
  { value: 'pinterest', label: 'Pinterest' },
]

interface GeneratePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pages: Page[]
  defaultPageId?: string
  onGenerated: (post: Post) => void
}

export function GeneratePostDialog({
  open,
  onOpenChange,
  pages,
  defaultPageId,
  onGenerated,
}: GeneratePostDialogProps) {
  const [pageId, setPageId] = useState(defaultPageId ?? '')
  const [platform, setPlatform] = useState('twitter')
  const [tone, setTone] = useState('')
  const [abTest, setAbTest] = useState(false)
  const [variantCount, setVariantCount] = useState(2)
  const generatePosts = useGeneratePosts()
  const generateVariants = useGenerateVariants()
  const isPending = generatePosts.isPending || generateVariants.isPending

  const crawledPages = pages.filter((p) => p.status === 'crawled')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      if (abTest) {
        const result = await generateVariants.mutateAsync({ id: pageId, platform, variant_count: variantCount })
        toast.success(`${result.variants.length} variants generated`)
        onOpenChange(false)
        onGenerated(result.variants[0].post)
      } else {
        const post = await generatePosts.mutateAsync({ id: pageId, platform, tone })
        toast.success('Post generated')
        onOpenChange(false)
        onGenerated(post)
      }
      setTone('')
      setAbTest(false)
      setVariantCount(2)
    } catch (error) {
      const message = isAxiosError(error) ? error.response?.data?.detail : undefined
      toast.error(message ?? 'Failed to generate post')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate post</DialogTitle>
          <DialogDescription>Use Claude to draft a platform-native post from a crawled page.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="generate-page">Page</Label>
            <Select id="generate-page" required value={pageId} onChange={(e) => setPageId(e.target.value)}>
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
            <Label htmlFor="generate-platform">Platform</Label>
            <Select id="generate-platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          {!abTest && (
            <div className="space-y-2">
              <Label htmlFor="generate-tone">Tone (optional)</Label>
              <Input
                id="generate-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="informative and engaging"
              />
            </div>
          )}
          <div className="space-y-2 rounded-md border border-border-default bg-bg-surface p-3">
            <label className="flex items-center gap-2 text-body-sm text-text-primary">
              <input
                type="checkbox"
                checked={abTest}
                onChange={(e) => setAbTest(e.target.checked)}
                className="h-4 w-4 rounded border-border-default accent-accent-red"
              />
              Generate as A/B test
            </label>
            {abTest && (
              <div className="space-y-2 pt-1">
                <Label htmlFor="generate-variant-count">Number of variants</Label>
                <Select
                  id="generate-variant-count"
                  value={String(variantCount)}
                  onChange={(e) => setVariantCount(Number(e.target.value))}
                >
                  <option value="2">2 variants</option>
                  <option value="3">3 variants</option>
                </Select>
                <p className="text-caption text-text-muted">
                  Each variant is written with a different tone (informative, bold, curious) so they're genuinely
                  distinct, not near-duplicates.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !pageId}>
              {isPending ? (
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
