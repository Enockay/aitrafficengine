import { useState } from 'react'
import { Loader2, MessageCircle } from 'lucide-react'

import { SupportChatThread } from '@/components/support/SupportChatThread'
import {
  useAdminSupportConversationsQuery,
  useAdminSupportThreadQuery,
  useSendAdminReply,
} from '@/hooks/useAdminSupport'
import { cn } from '@/lib/utils'

function timeAgo(value: string) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function AdminSupport() {
  const { data: conversations, isLoading } = useAdminSupportConversationsQuery()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data: messages, isLoading: threadLoading } = useAdminSupportThreadQuery(selectedUserId)
  const sendReply = useSendAdminReply(selectedUserId)

  const selected = conversations?.find((c) => c.user_id === selectedUserId)

  return (
    <div>
      <h1 className="mb-1 text-h1 text-text-primary">Support</h1>
      <p className="mb-6 text-body-sm text-text-secondary">
        Every user's support thread — any admin can reply. Replies email the user automatically if
        they're not currently online.
      </p>

      <div className="grid grid-cols-1 gap-4 overflow-hidden rounded-xl border border-border-default lg:grid-cols-[280px_1fr]" style={{ height: '70vh' }}>
        <div className="overflow-y-auto border-b border-border-default lg:border-b-0 lg:border-r">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin text-text-muted" />
            </div>
          )}
          {!isLoading && (conversations?.length ?? 0) === 0 && (
            <div className="px-4 py-10 text-center">
              <MessageCircle size={20} className="mx-auto mb-2 text-text-muted" />
              <p className="text-body-sm text-text-secondary">No conversations yet.</p>
            </div>
          )}
          {conversations?.map((conversation) => (
            <button
              key={conversation.user_id}
              onClick={() => setSelectedUserId(conversation.user_id)}
              className={cn(
                'flex w-full flex-col gap-0.5 border-b border-border-default px-4 py-3 text-left transition-colors hover:bg-bg-tertiary',
                selectedUserId === conversation.user_id && 'bg-bg-tertiary'
              )}
            >
              <div className="flex items-center justify-between">
                <p className="truncate text-body-sm font-medium text-text-primary">{conversation.user_name}</p>
                <span className="shrink-0 text-caption text-text-muted">{timeAgo(conversation.last_message_at)}</span>
              </div>
              <p className="truncate text-caption text-text-muted">
                {conversation.last_sender_role === 'admin' ? 'You: ' : ''}
                {conversation.last_message}
              </p>
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-col">
          {!selectedUserId && (
            <div className="flex flex-1 items-center justify-center text-body-sm text-text-muted">
              Select a conversation to view it
            </div>
          )}
          {selectedUserId && (
            <>
              <div className="border-b border-border-default px-4 py-3">
                <p className="text-body-sm font-medium text-text-primary">{selected?.user_name}</p>
                <p className="text-caption text-text-muted">{selected?.user_email}</p>
              </div>
              <SupportChatThread
                messages={messages}
                isLoading={threadLoading}
                viewerRole="admin"
                onSend={(body) => sendReply.mutateAsync(body)}
                isSending={sendReply.isPending}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
