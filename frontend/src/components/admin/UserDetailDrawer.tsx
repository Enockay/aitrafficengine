import { useState } from 'react'
import { toast } from 'sonner'
import { Activity, FileText, Globe, Loader2, ShieldAlert, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  useAdminUserDetailQuery,
  useOverrideUserPlan,
  useSetUserRole,
  useSetUserStatus,
  useSoftDeleteUser,
  type AdminUser,
} from '@/hooks/useAdminUsers'
import { getErrorMessage } from '@/lib/errors'
import { getInitials } from '@/lib/utils'

const PLAN_CODES = ['starter', 'growth', 'agency']

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeAgo(value: string) {
  const diffMs = Date.now() - new Date(value).getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return formatDate(value)
}

function formatAction(action: string) {
  return action
    .split('_')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ')
}

export function UserDetailDrawer({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { data: detail, isLoading } = useAdminUserDetailQuery(user.id)
  const setStatus = useSetUserStatus()
  const setRole = useSetUserRole()
  const overridePlan = useOverrideUserPlan()
  const softDelete = useSoftDeleteUser()
  const [planCode, setPlanCode] = useState(user.plan_code ?? 'starter')

  async function handleToggleStatus() {
    try {
      await setStatus.mutateAsync({ id: user.id, is_active: !user.is_active })
      toast.success(user.is_active ? 'User suspended' : 'User reactivated')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update status'))
    }
  }

  async function handleRoleChange(role: string) {
    try {
      await setRole.mutateAsync({ id: user.id, role })
      toast.success(`Role changed to ${role}`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to change role'))
    }
  }

  async function handlePlanOverride() {
    try {
      await overridePlan.mutateAsync({ id: user.id, plan_code: planCode, status: 'active' })
      toast.success(`Plan set to ${planCode}`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to override plan'))
    }
  }

  async function handleDelete() {
    if (!confirm(`Soft-delete ${user.email}? Their account will be deactivated and hidden from lists.`)) return
    try {
      await softDelete.mutateAsync(user.id)
      toast.success('User deleted')
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete user'))
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-border-default bg-bg-secondary shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-border-default p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-purple/20 text-body-sm font-semibold text-accent-purple">
              {getInitials(user.full_name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-h3 text-text-primary">{user.full_name}</h2>
                {user.role === 'admin' && <Badge variant="info">Admin</Badge>}
              </div>
              <p className="truncate text-body-sm text-text-secondary">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <Badge variant={user.is_active ? 'success' : 'error'}>
              {user.is_active ? 'Active' : 'Suspended'}
            </Badge>
            <span className="text-caption text-text-muted">Joined {formatDate(user.created_at)}</span>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-border-default p-3">
              <Globe size={14} className="mb-2 text-text-muted" />
              <p className="text-metric-lg text-text-primary">{user.sites_count}</p>
              <p className="text-metric-label uppercase text-text-muted">Sites</p>
            </div>
            <div className="rounded-md border border-border-default p-3">
              <FileText size={14} className="mb-2 text-text-muted" />
              <p className="text-metric-lg text-text-primary">{user.posts_count}</p>
              <p className="text-metric-label uppercase text-text-muted">Posts</p>
            </div>
            <div className="rounded-md border border-border-default p-3">
              <ShieldAlert size={14} className="mb-2 text-text-muted" />
              <p className="truncate text-metric-lg capitalize text-text-primary">{user.plan_code ?? '—'}</p>
              <p className="text-metric-label uppercase text-text-muted">Plan</p>
            </div>
          </div>

          <div className="mb-6 space-y-2 text-body-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Subscription status</span>
              <span className="capitalize text-text-primary">{user.subscription_status ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Trial ends</span>
              <span className="text-text-primary">{formatDate(detail?.trial_ends_at ?? null)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Period ends</span>
              <span className="text-text-primary">{formatDate(detail?.current_period_end ?? null)}</span>
            </div>
          </div>

          <div className="mb-6 space-y-3 rounded-md border border-border-default p-4">
            <p className="text-body-sm font-medium text-text-primary">Actions</p>

            <div className="flex items-center justify-between">
              <span className="text-body-sm text-text-secondary">Account status</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleToggleStatus}
                disabled={setStatus.isPending}
              >
                {setStatus.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : user.is_active ? (
                  'Suspend'
                ) : (
                  'Reactivate'
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-body-sm text-text-secondary">Role</span>
              <Select
                className="w-32"
                value={user.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                disabled={setRole.isPending}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0 text-body-sm text-text-secondary">Override plan</span>
              <div className="flex items-center gap-2">
                <Select className="w-28" value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
                  {PLAN_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePlanOverride}
                  disabled={overridePlan.isPending}
                >
                  {overridePlan.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Set'}
                </Button>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 size={18} className="animate-spin text-text-muted" />
            </div>
          )}

          {detail && (
            <>
              <h3 className="mb-3 flex items-center gap-1.5 text-h3 text-text-primary">
                <Activity size={15} className="text-text-muted" /> Recent activity
              </h3>
              {detail.recent_activity.length === 0 ? (
                <p className="text-body-sm text-text-secondary">No activity recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.recent_activity.map((entry) => (
                    <li key={entry.id} className="rounded-md border border-border-default p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-body-sm font-medium text-text-primary">
                          {formatAction(entry.action)}
                        </p>
                        <span className="shrink-0 text-caption text-text-muted">{timeAgo(entry.created_at)}</span>
                      </div>
                      <p className="mt-0.5 text-caption capitalize text-text-muted">{entry.entity_type}</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border-default p-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={softDelete.isPending}
            className="flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-body-sm text-accent-red transition-colors hover:bg-accent-red/10 disabled:opacity-50"
          >
            {softDelete.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Delete account'}
          </button>
        </div>
      </aside>
    </>
  )
}
