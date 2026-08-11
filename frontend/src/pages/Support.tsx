import { useEffect } from 'react'

import { SupportChatThread } from '@/components/support/SupportChatThread'
import { useSendSupportMessage, useSupportThreadQuery, useSupportUnread } from '@/hooks/useSupportChat'

export default function Support() {
  const { data: messages, isLoading } = useSupportThreadQuery()
  const sendMessage = useSendSupportMessage()
  const { markRead } = useSupportUnread()

  useEffect(() => {
    markRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  return (
    <div>
      <h1 className="mb-1 text-h1 text-text-primary">Support</h1>
      <p className="mb-6 text-body-sm text-text-secondary">
        Chat with our team. If nobody's around, we'll email you as soon as we reply.
      </p>

      <div className="h-[65vh] overflow-hidden rounded-xl border border-border-default bg-bg-secondary">
        <SupportChatThread
          messages={messages}
          isLoading={isLoading}
          viewerRole="user"
          onSend={(body) => sendMessage.mutateAsync(body)}
          isSending={sendMessage.isPending}
          emptyLabel="Send us a message and we'll get back to you."
        />
      </div>
    </div>
  )
}
