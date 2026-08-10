import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import api from '@/lib/api'

export interface SupportMessage {
  id: string
  sender_id: string
  sender_role: 'user' | 'admin'
  body: string
  created_at: string
}

export function useSupportThreadQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: ['support-thread'],
    queryFn: async () => {
      const { data } = await api.get<SupportMessage[]>('/support/messages')
      return data
    },
    enabled,
  })
}

export function useSupportContactEmailQuery() {
  return useQuery({
    queryKey: ['support-contact-email'],
    queryFn: async () => {
      const { data } = await api.get<{ email: string }>('/support/contact-email')
      return data.email
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useSendSupportMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => {
      const { data } = await api.post<SupportMessage>('/support/messages', { body })
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['support-thread'] }),
  })
}
