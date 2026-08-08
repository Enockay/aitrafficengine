import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBrevoConfigQuery, useRemoveBrevoConfig, useSetBrevoConfig } from '@/hooks/useAdminIntegrations'
import { getErrorMessage } from '@/lib/errors'

export function BrevoConfigCard() {
  const { data: status, isLoading } = useBrevoConfigQuery()
  const [editing, setEditing] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [senderName, setSenderName] = useState('')

  const setConfig = useSetBrevoConfig()
  const removeConfig = useRemoveBrevoConfig()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await setConfig.mutateAsync({ api_key: apiKey, sender_email: senderEmail, sender_name: senderName })
      toast.success('Brevo config saved')
      setApiKey('')
      setSenderEmail('')
      setSenderName('')
      setEditing(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save Brevo config'))
    }
  }

  async function handleRemove() {
    if (!confirm('Remove stored Brevo config? Email sending will fall back to .env if set.')) return
    try {
      await removeConfig.mutateAsync()
      toast.success('Brevo config removed')
    } catch {
      toast.error('Failed to remove Brevo config')
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
          <p className="text-body font-medium text-text-primary">Brevo</p>
          <p className="text-caption text-text-muted">Sends verification, password reset, and report emails.</p>
        </div>
        <Badge variant={status.configured ? 'success' : 'warning'}>
          {status.configured ? (status.source === 'database' ? 'Configured' : 'Configured (env)') : 'Setup required'}
        </Badge>
      </div>

      {!editing ? (
        <>
          {status.configured && (
            <div className="mb-3 space-y-2">
              <div className="rounded-md bg-bg-surface px-3 py-2">
                <p className="text-caption text-text-muted">API key</p>
                <p className="font-mono text-body-sm text-text-secondary">{status.api_key_preview}</p>
              </div>
              <div className="rounded-md bg-bg-surface px-3 py-2">
                <p className="text-caption text-text-muted">Sender</p>
                <p className="text-body-sm text-text-secondary">
                  {status.sender_name} &lt;{status.sender_email}&gt;
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => setEditing(true)}>
              <Pencil size={13} />
              {status.configured ? 'Update' : 'Add config'}
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
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="brevo-api-key">API key</Label>
            <Input
              id="brevo-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="xkeysib-..."
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brevo-sender-email">Sender email</Label>
            <Input
              id="brevo-sender-email"
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="no-reply@yourdomain.com"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brevo-sender-name">Sender name</Label>
            <Input
              id="brevo-sender-name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="AI Traffic Engine"
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
                setApiKey('')
                setSenderEmail('')
                setSenderName('')
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="flex-1" disabled={setConfig.isPending}>
              {setConfig.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
