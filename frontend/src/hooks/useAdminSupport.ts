import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import api from '@/lib/api'
import type { SupportMessage } from '@/hooks/useSupportChat'

export interface AdminSupportConversation {
  user_id: string
  user_email: string
  user_name: string
  last_message: string
  last_message_at: string
  last_sender_role: 'user' | 'admin'
}

export function useAdminSupportConversationsQuery() {
  return useQuery({
    queryKey: ['admin-support-conversations'],
    queryFn: async () => {
      const { data } = await api.get<AdminSupportConversation[]>('/admin/support/conversations')
      return data
    },
    // Fallback poll in case a realtime event is ever missed (tab was asleep, etc.) —
    // the WS event is still the primary, near-instant update path.
    refetchInterval: 30000,
  })
}

export function useAdminSupportThreadQuery(userId: string | null) {
  return useQuery({
    queryKey: ['admin-support-thread', userId],
    queryFn: async () => {
      const { data } = await api.get<SupportMessage[]>(`/admin/support/conversations/${userId}/messages`)
      return data
    },
    enabled: !!userId,
  })
}

export function useSendAdminReply(userId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => {
      const { data } = await api.post<SupportMessage>(`/admin/support/conversations/${userId}/messages`, { body })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-thread', userId] })
      queryClient.invalidateQueries({ queryKey: ['admin-support-conversations'] })
    },
  })
}
