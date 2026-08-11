import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

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

function lastReadKey(userId: string) {
  return `support_last_read_at:${userId}`
}

// No backend read/unread state exists for support messages — this derives it
// client-side by comparing the latest admin reply's timestamp against a per-user
// "last opened the chat drawer" timestamp kept in localStorage. Good enough for a
// single-browser unread dot; doesn't sync "read" across devices.
export function useSupportUnread() {
  const userId = useAuthStore((state) => state.user?.id)
  // Keep this query always mounted (not gated on the drawer being open) so the
  // widget can show an unread dot before the user ever opens the chat — it shares
  // its cache/network request with SupportChatDrawer's own query once that opens.
  const { data: messages } = useSupportThreadQuery(!!userId)

  const lastAdminMessageAt = messages
    ?.filter((m) => m.sender_role === 'admin')
    .reduce<string | null>((latest, m) => (!latest || m.created_at > latest ? m.created_at : latest), null)

  const lastReadAt = userId ? localStorage.getItem(lastReadKey(userId)) : null
  const hasUnread = !!lastAdminMessageAt && (!lastReadAt || lastAdminMessageAt > lastReadAt)

  function markRead() {
    if (!userId) return
    // Prefer the latest known message's own timestamp over the client clock — avoids
    // the badge reappearing on the next refetch if the client's clock lags the server's.
    localStorage.setItem(lastReadKey(userId), lastAdminMessageAt ?? new Date().toISOString())
  }

  return { hasUnread, markRead }
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
