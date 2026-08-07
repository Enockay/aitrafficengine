import { useQuery } from '@tanstack/react-query'

import api from '@/lib/api'

export interface AdminPayment {
  id: string
  user_id: string
  user_email: string
  plan_code: string | null
  amount: string
  currency: string
  channel: string | null
  paystack_reference: string
  paid_at: string
}

export interface AdminPaymentListResponse {
  items: AdminPayment[]
  total: number
  page: number
  limit: number
}

export interface RevenueMonthPoint {
  month: string
  amount: number
  currency: string
}

export interface RevenueSummary {
  total_revenue_by_currency: Record<string, number>
  mrr_estimate_usd: number
  monthly_series: RevenueMonthPoint[]
}

export function useAdminPaymentsQuery(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['admin', 'payments', page, limit],
    queryFn: async () => {
      const { data } = await api.get<AdminPaymentListResponse>('/admin/payments', { params: { page, limit } })
      return data
    },
  })
}

export function useRevenueSummaryQuery() {
  return useQuery({
    queryKey: ['admin', 'revenue-summary'],
    queryFn: async () => {
      const { data } = await api.get<RevenueSummary>('/admin/revenue/summary')
      return data
    },
  })
}
