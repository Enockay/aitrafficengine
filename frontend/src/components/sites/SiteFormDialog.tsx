import { type FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import { useCreateSite, useUpdateSite } from '@/hooks/useSites'
import { getErrorMessage } from '@/lib/errors'
import type { CrawlFrequency, Site } from '@/types/site'

interface SiteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  site?: Site | null
}

const CRAWL_FREQUENCIES: CrawlFrequency[] = ['daily', 'weekly', 'biweekly', 'monthly']

export function SiteFormDialog({ open, onOpenChange, site }: SiteFormDialogProps) {
  const isEditing = !!site
  const createSite = useCreateSite()
  const updateSite = useUpdateSite()

  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [description, setDescription] = useState('')
  const [crawlFrequency, setCrawlFrequency] = useState<CrawlFrequency>('weekly')

  useEffect(() => {
    if (open) {
      setName(site?.name ?? '')
      setDomain(site?.domain ?? '')
      setDescription(site?.description ?? '')
      setCrawlFrequency(site?.crawl_frequency ?? 'weekly')
    }
  }, [open, site])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      if (isEditing) {
        await updateSite.mutateAsync({
          id: site.id,
          input: { name, domain, description, crawl_frequency: crawlFrequency },
        })
        toast.success('Site updated')
      } else {
        await createSite.mutateAsync({ name, domain, description, crawl_frequency: crawlFrequency })
        toast.success('Site added')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Something went wrong'))
    }
  }

  const isSubmitting = createSite.isPending || updateSite.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit site' : 'Add site'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update this site\'s details.' : 'Add a website you want to promote.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="site-name">Name</Label>
            <Input id="site-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-domain">Domain</Label>
            <Input
              id="site-domain"
              required
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-description">Description</Label>
            <textarea
              id="site-description"
              rows={3}
              className="flex w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-body text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:border-border-focus"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-frequency">Crawl frequency</Label>
            <Select
              id="site-frequency"
              value={crawlFrequency}
              onChange={(e) => setCrawlFrequency(e.target.value as CrawlFrequency)}
            >
              {CRAWL_FREQUENCIES.map((freq) => (
                <option key={freq} value={freq}>
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Save changes'
              ) : (
                'Add site'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
