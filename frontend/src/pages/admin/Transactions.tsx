import { useState } from 'react'
import { Loader2, Receipt } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { useAdminTransactionsQuery } from '@/hooks/useAdminBilling'

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Success', value: 'success' },
  { label: 'Failed', value: 'failed' },
  { label: 'Abandoned', value: 'abandoned' },
] as const

function StatusBadge({ status }: { status: string }) {
  if (status === 'success') return <Badge variant="success">Success</Badge>
  if (status === 'failed') return <Badge variant="error">Failed</Badge>
  if (status === 'abandoned') return <Badge variant="warning">Abandoned</Badge>
  return <Badge variant="neutral">{status}</Badge>
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function AdminTransactions() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const { data, isLoading, isError, error } = useAdminTransactionsQuery(page, 20, status)

  return (
    <div>
      <h1 className="mb-1 text-h1 text-text-primary">Transactions</h1>
      <p className="mb-6 text-body-sm text-text-secondary">
        Every Paystack transaction attempt — pulled live from Paystack, including failed and abandoned
        checkouts that never make it into the revenue ledger.
      </p>

      <div className="mb-4 flex items-center gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.label}
            onClick={() => {
              setStatus(filter.value)
              setPage(1)
            }}
            className={`rounded-md px-3 py-1.5 text-body-sm transition-colors ${
              status === filter.value
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'text-text-secondary hover:bg-bg-tertiary'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isError && (
        <div className="rounded-lg border border-border-default bg-bg-secondary p-6 text-center text-body-sm text-accent-red">
          {(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            'Failed to load transactions.'}
        </div>
      )}

      {!isError && (
        <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-border-default bg-bg-secondary">
                <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Reference
                </th>
                <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Customer
                </th>
                <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Plan
                </th>
                <th className="px-4 py-3 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Amount
                </th>
                <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Response
                </th>
                <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-body-sm text-text-secondary">
                    <Loader2 size={18} className="mx-auto animate-spin" />
                  </td>
                </tr>
              )}
              {!isLoading && (data?.items.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <Receipt size={22} className="mx-auto mb-2 text-text-muted" />
                    <p className="text-body-sm text-text-secondary">No transactions found.</p>
                  </td>
                </tr>
              )}
              {data?.items.map((tx, index) => (
                <tr
                  key={tx.id}
                  className={`border-b border-border-default last:border-0 ${
                    index % 2 === 1 ? 'bg-bg-secondary/30' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-body-sm text-text-primary">{tx.reference}</td>
                  <td className="px-4 py-3 text-body-sm text-text-secondary">{tx.customer_email ?? '—'}</td>
                  <td className="px-4 py-3 text-body-sm capitalize text-text-secondary">{tx.plan_code || '—'}</td>
                  <td className="px-4 py-3 text-right text-body-sm tabular-nums font-medium text-text-primary">
                    {tx.amount.toLocaleString()} {tx.currency}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-body-sm text-text-secondary" title={tx.gateway_response ?? ''}>
                    {tx.gateway_response ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-body-sm text-text-secondary">
                    {formatDate(tx.paid_at ?? tx.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > data.per_page && (
        <div className="mt-4 flex items-center justify-center gap-3 text-body-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md px-3 py-1.5 text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-text-muted">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * data.per_page >= data.total}
            className="rounded-md px-3 py-1.5 text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
