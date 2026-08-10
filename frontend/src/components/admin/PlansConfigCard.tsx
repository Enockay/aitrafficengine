import { Loader2 } from 'lucide-react'

import { useAdminPlansQuery } from '@/hooks/useAdminIntegrations'

export function PlansConfigCard() {
  const { data: plans, isLoading, isError } = useAdminPlansQuery()

  return (
    <div className="rounded-xl border border-border-default bg-bg-secondary p-5 sm:col-span-2">
      <div className="mb-3">
        <p className="text-body font-medium text-text-primary">Subscription plans</p>
        <p className="text-caption text-text-muted">
          Each plan's Paystack plan_code — checkout fails with "Plan not found" if a code here doesn't
          match a plan that actually exists on the configured Paystack account.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 size={18} className="animate-spin text-text-muted" />
        </div>
      )}
      {isError && <p className="py-4 text-center text-body-sm text-accent-red">Failed to load plans.</p>}

      {plans && (
        <div className="overflow-hidden rounded-lg border border-border-default">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-default bg-bg-tertiary">
                <th className="px-3 py-2 text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Plan
                </th>
                <th className="px-3 py-2 text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Price
                </th>
                <th className="px-3 py-2 text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Paystack plan_code
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan, index) => (
                <tr key={plan.code} className={index % 2 === 1 ? 'bg-bg-surface/50' : undefined}>
                  <td className="px-3 py-2 text-body-sm text-text-primary">{plan.name}</td>
                  <td className="px-3 py-2 text-body-sm text-text-secondary">${plan.price_usd}/mo</td>
                  <td className="px-3 py-2 font-mono text-body-sm text-text-secondary">{plan.paystack_plan_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
