import { type ChangeEvent, useRef } from 'react'
import { toast } from 'sonner'
import { Loader2, Trash2, Upload } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useGeoipConfigQuery, useRemoveGeoipConfig, useSetGeoipConfig } from '@/hooks/useAdminIntegrations'
import { getErrorMessage } from '@/lib/errors'

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

export function GeoipConfigCard() {
  const { data: status, isLoading } = useGeoipConfigQuery()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const setConfig = useSetGeoipConfig()
  const removeConfig = useRemoveGeoipConfig()

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      await setConfig.mutateAsync(file)
      toast.success('GeoIP database uploaded — visitor locations will start resolving.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to upload GeoIP database'))
    }
  }

  async function handleRemove() {
    if (!confirm('Remove the stored GeoIP database? Visitor locations will show as Unknown again.')) return
    try {
      await removeConfig.mutateAsync()
      toast.success('GeoIP database removed')
    } catch {
      toast.error('Failed to remove GeoIP database')
    }
  }

  if (isLoading || !status) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-border-default bg-bg-secondary">
        <Loader2 size={18} className="animate-spin text-text-muted" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border-default bg-bg-secondary p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-body font-medium text-text-primary">GeoLite2 database</p>
          <p className="text-caption text-text-muted">Resolves visitor IPs to country/city on the Traffic page.</p>
        </div>
        <Badge variant={status.configured ? 'success' : 'warning'}>
          {status.configured ? (status.source === 'database' ? 'Configured' : 'Configured (env)') : 'Setup required'}
        </Badge>
      </div>

      {status.configured && (
        <div className="mb-3 space-y-2">
          <div className="rounded-md bg-bg-surface px-3 py-2">
            <p className="text-caption text-text-muted">File</p>
            <p className="font-mono text-body-sm text-text-secondary">
              {status.filename}
              {status.size_bytes ? ` · ${formatBytes(status.size_bytes)}` : ''}
            </p>
          </div>
        </div>
      )}

      {!status.configured && (
        <p className="mb-3 text-caption text-text-muted">
          Upload a free MaxMind GeoLite2-City.mmdb file (requires a MaxMind account license).
        </p>
      )}

      <input ref={fileInputRef} type="file" accept=".mmdb" className="hidden" onChange={handleFileChange} />
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={setConfig.isPending}
        >
          {setConfig.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={13} />}
          {status.configured ? 'Replace file' : 'Upload .mmdb'}
        </Button>
        {status.configured && status.source === 'database' && (
          <Button variant="secondary" size="sm" onClick={handleRemove} disabled={removeConfig.isPending} title="Remove">
            {removeConfig.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} className="text-accent-red" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
