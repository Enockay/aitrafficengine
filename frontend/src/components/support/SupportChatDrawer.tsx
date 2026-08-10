import { X } from 'lucide-react'

import { SupportChatThread } from '@/components/support/SupportChatThread'
import { useSendSupportMessage, useSupportThreadQuery } from '@/hooks/useSupportChat'

interface SupportChatDrawerProps {
  open: boolean
  onClose: () => void
}

export function SupportChatDrawer({ open, onClose }: SupportChatDrawerProps) {
  const { data: messages, isLoading } = useSupportThreadQuery(open)
  const sendMessage = useSendSupportMessage()

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 right-0 z-50 flex h-[70vh] w-full max-w-sm flex-col rounded-t-xl border border-border-default bg-bg-secondary shadow-2xl sm:bottom-6 sm:right-6 sm:h-[520px] sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
          <div>
            <p className="text-body font-medium text-text-primary">Support</p>
            <p className="text-caption text-text-muted">We usually reply within minutes.</p>
          </div>
          <button onClick={onClose} className="text-text-muted transition-colors hover:text-text-primary">
            <X size={18} />
          </button>
        </div>
        <SupportChatThread
          messages={messages}
          isLoading={isLoading}
          viewerRole="user"
          onSend={(body) => sendMessage.mutateAsync(body)}
          isSending={sendMessage.isPending}
          emptyLabel="Send us a message and we'll get back to you."
        />
      </div>
    </>
  )
}
