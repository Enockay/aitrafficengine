import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRemovePlatformCredentials, useSetPlatformCredentials, useSetPlatformEnabled } from '@/hooks/usePlatforms'
import { getErrorMessage } from '@/lib/errors'
import type { PlatformCredentialStatus } from '@/types/platform'

const PLATFORM_META: Record<string, { label: string; glyph: string; color: string; helpUrl: string }> = {
  twitter: {
    label: 'X / Twitter',
    glyph: '𝕏',
    color: '#000000',
    helpUrl: 'https://developer.twitter.com/en/portal/dashboard',
  },
  linkedin: {
    label: 'LinkedIn',
    glyph: 'in',
    color: '#0A66C2',
    helpUrl: 'https://www.linkedin.com/developers/apps',
  },
  reddit: {
    label: 'Reddit',
    glyph: 'r/',
    color: '#FF4500',
    helpUrl: 'https://www.reddit.com/prefs/apps',
  },
  tumblr: {
    label: 'Tumblr',
    glyph: 't',
    color: '#36465D',
    helpUrl: 'https://www.tumblr.com/oauth/apps',
  },
  pinterest: {
    label: 'Pinterest',
    glyph: 'P',
    color: '#E60023',
    helpUrl: 'https://developers.pinterest.com/apps',
  },
}

interface PlatformCredentialCardProps {
  status: PlatformCredentialStatus
  canManage: boolean
}

export function PlatformCredentialCard({ status, canManage }: PlatformCredentialCardProps) {
  const meta = PLATFORM_META[status.platform] ?? {
    label: status.platform,
    glyph: status.platform.slice(0, 1).toUpperCase(),
    color: '#6B7280',
    helpUrl: '#',
  }
  const [editing, setEditing] = useState(false)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')

  const setCredentials = useSetPlatformCredentials()
  const removeCredentials = useRemovePlatformCredentials()
  const setEnabled = useSetPlatformEnabled()

  async function handleToggleEnabled() {
    const next = !status.is_enabled
    if (!next && !confirm(`Hide ${meta.label} from all users? They won't be able to see or connect it until you re-enable it.`)) {
      return
    }
    try {
      await setEnabled.mutateAsync({ platform: status.platform, is_enabled: next })
      toast.success(next ? `${meta.label} is visible to users again` : `${meta.label} is now hidden from users`)
    } catch {
      toast.error('Failed to update visibility')
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await setCredentials.mutateAsync({ platform: status.platform, client_id: clientId, client_secret: clientSecret })
      toast.success(`${meta.label} credentials saved`)
      setClientId('')
      setClientSecret('')
      setEditing(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save credentials'))
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove stored ${meta.label} credentials?`)) return
    try {
      await removeCredentials.mutateAsync(status.platform)
      toast.success(`${meta.label} credentials removed`)
    } catch {
      toast.error('Failed to remove credentials')
    }
  }

  return (
    <div className="rounded-xl border border-border-default bg-bg-secondary p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-body font-semibold text-white"
            style={{ backgroundColor: meta.color }}
          >
            {meta.glyph}
          </div>
          <div>
            <p className="text-body font-medium text-text-primary">{meta.label}</p>
            <a
              href={meta.helpUrl}
              target="_blank"
              rel="noreferrer"
              className="text-caption text-accent-blue hover:underline"
            >
              Get credentials
            </a>
          </div>
        </div>
        <Badge variant={status.configured ? 'success' : 'warning'}>
          {status.configured ? (status.source === 'database' ? 'Configured' : 'Configured (env)') : 'Setup required'}
        </Badge>
      </div>

      <button
        type="button"
        onClick={handleToggleEnabled}
        disabled={setEnabled.isPending || !canManage}
        className="mb-3 flex w-full items-center justify-between rounded-md border border-border-default bg-bg-surface px-3 py-2 text-body-sm transition-colors hover:border-accent-red disabled:cursor-default disabled:opacity-50 disabled:hover:border-border-default"
      >
        <span className="flex items-center gap-2 text-text-secondary">
          {status.is_enabled ? <Eye size={14} /> : <EyeOff size={14} className="text-accent-yellow" />}
          {status.is_enabled ? 'Visible to users' : 'Hidden from users'}
        </span>
        {setEnabled.isPending ? (
          <Loader2 size={14} className="animate-spin text-text-muted" />
        ) : (
          canManage && <span className="text-caption text-accent-blue">{status.is_enabled ? 'Hide' : 'Unhide'}</span>
        )}
      </button>

      {!editing ? (
        <>
          {status.configured && (
            <div className="mb-3 rounded-md bg-bg-surface px-3 py-2">
              <p className="text-caption text-text-muted">Client ID</p>
              <p className="font-mono text-body-sm text-text-secondary">{status.client_id_preview}</p>
            </div>
          )}
          {canManage ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setEditing(true)}>
                <Pencil size={13} />
                {status.configured ? 'Update' : 'Add credentials'}
              </Button>
              {status.configured && status.source === 'database' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRemove}
                  disabled={removeCredentials.isPending}
                  title="Remove"
                >
                  {removeCredentials.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} className="text-accent-red" />
                  )}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-caption text-text-muted">Only admins can manage these credentials.</p>
          )}
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${status.platform}-client-id`}>Client ID</Label>
            <Input
              id={`${status.platform}-client-id`}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${status.platform}-client-secret`}>Client secret</Label>
            <Input
              id={`${status.platform}-client-secret`}
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => {
                setEditing(false)
                setClientId('')
                setClientSecret('')
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="flex-1" disabled={setCredentials.isPending}>
              {setCredentials.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
