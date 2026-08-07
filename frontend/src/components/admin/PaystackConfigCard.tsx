import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { Loader2, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePaystackConfigQuery, useRemovePaystackConfig, useSetPaystackConfig } from '@/hooks/useAdminIntegrations'

export function PaystackConfigCard() {
  const { data: status, isLoading } = usePaystackConfigQuery()
  const [editing, setEditing] = useState(false)
  const [secretKey, setSecretKey] = useState('')
  const [publicKey, setPublicKey] = useState('')

  const setConfig = useSetPaystackConfig()
  const removeConfig = useRemovePaystackConfig()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await setConfig.mutateAsync({ secret_key: secretKey, public_key: publicKey })
      toast.success('Paystack config saved')
      setSecretKey('')
      setPublicKey('')
      setEditing(false)
    } catch (error) {
      const message = isAxiosError(error) ? error.response?.data?.detail : undefined
      toast.error(message ?? 'Failed to save Paystack config')
    }
  }

  async function handleRemove() {
    if (!confirm('Remove stored Paystack config? Billing will fall back to .env if set.')) return
    try {
      await removeConfig.mutateAsync()
      toast.success('Paystack config removed')
    } catch {
      toast.error('Failed to remove Paystack config')
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
          <p className="text-body font-medium text-text-primary">Paystack</p>
          <p className="text-caption text-text-muted">Powers subscription checkout and billing webhooks.</p>
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
                <p className="text-caption text-text-muted">Secret key</p>
                <p className="font-mono text-body-sm text-text-secondary">{status.secret_key_preview}</p>
              </div>
              <div className="rounded-md bg-bg-surface px-3 py-2">
                <p className="text-caption text-text-muted">Public key</p>
                <p className="font-mono text-body-sm text-text-secondary">{status.public_key}</p>
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
            <Label htmlFor="paystack-secret-key">Secret key</Label>
            <Input
              id="paystack-secret-key"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="sk_live_..."
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paystack-public-key">Public key</Label>
            <Input
              id="paystack-public-key"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="pk_live_..."
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
                setSecretKey('')
                setPublicKey('')
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
