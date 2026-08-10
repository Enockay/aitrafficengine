import { useState } from 'react'
import { toast } from 'sonner'
import { Layers, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'

import { PlanFormDialog } from '@/components/admin/PlanFormDialog'
import { Button } from '@/components/ui/button'
import { type AdminPlan, useAdminPlansQuery, useDeletePlan } from '@/hooks/useAdminPlans'
import { getErrorMessage } from '@/lib/errors'

export default function AdminPlans() {
  const { data: plans, isLoading, isError } = useAdminPlansQuery()
  const deletePlan = useDeletePlan()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null)

  function openCreate() {
    setEditingPlan(null)
    setDialogOpen(true)
  }

  function openEdit(plan: AdminPlan) {
    setEditingPlan(plan)
    setDialogOpen(true)
  }

  async function handleDelete(plan: AdminPlan) {
    if (!confirm(`Delete the ${plan.name} plan? This can't be undone.`)) return
    try {
      await deletePlan.mutateAsync(plan.code)
      toast.success('Plan deleted')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete plan'))
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-h1 text-text-primary">Plans</h1>
          <p className="text-body-sm text-text-secondary">
            Subscription tiers and the Paystack plan_code each is wired to — checkout fails with "Plan
            not found" if a code here doesn't match a plan that actually exists on the configured
            Paystack account.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} />
          Add plan
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      )}
      {isError && <p className="py-12 text-center text-body-sm text-accent-red">Failed to load plans.</p>}

      {plans && (
        <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-default bg-bg-secondary">
                <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Plan
                </th>
                <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Sites
                </th>
                <th className="px-4 py-3 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Posts/mo
                </th>
                <th className="px-4 py-3 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Flyers/mo
                </th>
                <th className="px-4 py-3 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Horizon
                </th>
                <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Paystack plan_code
                </th>
                <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <Layers size={22} className="mx-auto mb-2 text-text-muted" />
                    <p className="text-body-sm text-text-secondary">No plans configured yet.</p>
                  </td>
                </tr>
              )}
              {plans.map((plan, index) => (
                <tr
                  key={plan.code}
                  className={`border-b border-border-default last:border-0 ${
                    index % 2 === 1 ? 'bg-bg-secondary/30' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-body-sm text-text-primary">
                    {plan.name}
                    <span className="ml-1.5 text-caption text-text-muted">({plan.code})</span>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-text-secondary">${plan.price_usd}/mo</td>
                  <td className="px-4 py-3 text-right text-body-sm tabular-nums text-text-secondary">
                    {plan.max_sites}
                  </td>
                  <td className="px-4 py-3 text-right text-body-sm tabular-nums text-text-secondary">
                    {plan.max_posts_per_month}
                  </td>
                  <td className="px-4 py-3 text-right text-body-sm tabular-nums text-text-secondary">
                    {plan.max_flyers_per_month}
                  </td>
                  <td className="px-4 py-3 text-right text-body-sm tabular-nums text-text-secondary">
                    {plan.schedule_horizon_days}d
                  </td>
                  <td className="px-4 py-3 font-mono text-body-sm text-text-secondary">{plan.paystack_plan_code}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(plan)} title="Edit">
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDelete(plan)}
                        disabled={deletePlan.isPending}
                        title="Delete"
                      >
                        <Trash2 size={13} className="text-accent-red" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PlanFormDialog open={dialogOpen} onOpenChange={setDialogOpen} plan={editingPlan} />
    </div>
  )
}
