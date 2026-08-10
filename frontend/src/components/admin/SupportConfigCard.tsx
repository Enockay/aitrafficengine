import { type FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'

interface SupportConfigStatus {
  configured: boolean
  notification_email: string | null
  updated_at: string | null
}

function useSupportConfigQuery() {
  return useQuery({
    queryKey: ['admin', 'config', 'support'],
    queryFn: async () => {
      const { data } = await api.get<SupportConfigStatus>('/admin/config/support')
      return data
    },
  })
}

function useSetSupportConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (notification_email: string) => {
      const { data } = await api.put<SupportConfigStatus>('/admin/config/support', { notification_email })
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'config', 'support'] }),
  })
}

function useRemoveSupportConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<SupportConfigStatus>('/admin/config/support')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'config', 'support'] }),
  })
}

export function SupportConfigCard() {
  const { data: status, isLoading } = useSupportConfigQuery()
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState('')

  const setConfig = useSetSupportConfig()
  const removeConfig = useRemoveSupportConfig()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await setConfig.mutateAsync(email)
      toast.success('Support notification email saved')
      setEmail('')
      setEditing(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save support config'))
    }
  }

  async function handleRemove() {
    if (!confirm('Stop emailing anyone about unanswered support messages?')) return
    try {
      await removeConfig.mutateAsync()
      toast.success('Support notification email removed')
    } catch {
      toast.error('Failed to remove support config')
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
          <p className="text-body font-medium text-text-primary">Support alerts</p>
          <p className="text-caption text-text-muted">
            Emailed when a user's chat message goes unanswered for 5 minutes.
          </p>
        </div>
        <Badge variant={status.configured ? 'success' : 'warning'}>
          {status.configured ? 'Configured' : 'Setup required'}
        </Badge>
      </div>

      {!editing ? (
        <>
          {status.configured && (
            <div className="mb-3 rounded-md bg-bg-surface px-3 py-2">
              <p className="text-caption text-text-muted">Notification email</p>
              <p className="text-body-sm text-text-secondary">{status.notification_email}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => setEditing(true)}>
              <Pencil size={13} />
              {status.configured ? 'Update' : 'Add email'}
            </Button>
            {status.configured && (
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
            <Label htmlFor="support-notification-email">Notification email</Label>
            <Input
              id="support-notification-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="support@yourdomain.com"
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
                setEmail('')
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
