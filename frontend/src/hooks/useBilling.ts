import { useMutation, useQuery } from '@tanstack/react-query'

import api from '@/lib/api'

export interface Plan {
  code: string
  name: string
  price_usd: number
  max_sites: number
  max_posts_per_month: number
  max_flyers_per_month: number
  schedule_horizon_days: number
}

export interface Subscription {
  plan_code: string
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'incomplete'
  trial_ends_at: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

export interface Usage {
  plan_code: string | null
  schedule_horizon_days: number | null
  sites_used: number
  sites_limit: number | null
  posts_used_this_month: number
  posts_limit: number | null
  flyers_used_this_month: number
  flyers_limit: number | null
}

export interface InitializeTransaction {
  authorization_url: string
  reference: string
}

export function usePlansQuery() {
  return useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: async () => {
      const { data } = await api.get<Plan[]>('/billing/plans')
      return data
    },
    staleTime: 60 * 60 * 1000,
  })
}

export function useSubscriptionQuery() {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: async () => {
      const { data } = await api.get<Subscription>('/billing/subscription')
      return data
    },
  })
}

export function useUsageQuery() {
  return useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: async () => {
      const { data } = await api.get<Usage>('/billing/usage')
      return data
    },
  })
}

export function useSubscribe() {
  return useMutation({
    mutationFn: async (plan_code: string) => {
      const { data } = await api.post<InitializeTransaction>('/billing/subscribe', { plan_code })
      return data
    },
    onSuccess: (data) => {
      window.location.href = data.authorization_url
    },
  })
}
