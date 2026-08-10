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
