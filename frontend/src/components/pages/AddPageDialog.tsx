import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { Loader2 } from 'lucide-react'

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
import { useCreatePage } from '@/hooks/usePages'
import type { Site } from '@/types/site'

interface AddPageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sites: Site[]
  defaultSiteId?: string
}

export function AddPageDialog({ open, onOpenChange, sites, defaultSiteId }: AddPageDialogProps) {
  const [siteId, setSiteId] = useState(defaultSiteId ?? '')
  const [url, setUrl] = useState('')
  const createPage = useCreatePage()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      const page = await createPage.mutateAsync({ site_id: siteId, url })
      if (page.status === 'failed') {
        toast.error('Page added, but the crawler could not fetch it. Check the URL and try again.')
      } else {
        toast.success('Page added and crawled')
      }
      setUrl('')
      onOpenChange(false)
    } catch (error) {
      const message = isAxiosError(error) ? error.response?.data?.detail : undefined
      toast.error(message ?? 'Failed to add page')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add page</DialogTitle>
          <DialogDescription>Add a URL to crawl and extract content from.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="page-site">Site</Label>
            <Select id="page-site" required value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="" disabled>
                Select a site
              </option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-url">Page URL</Label>
            <Input
              id="page-url"
              type="url"
              required
              placeholder="https://example.com/blog/post"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPage.isPending || !siteId}>
              {createPage.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Crawling...
                </>
              ) : (
                'Add page'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
