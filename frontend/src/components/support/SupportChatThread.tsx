import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Loader2, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SupportMessage } from '@/hooks/useSupportChat'

interface SupportChatThreadProps {
  messages: SupportMessage[] | undefined
  isLoading: boolean
  viewerRole: 'user' | 'admin'
  onSend: (body: string) => Promise<unknown>
  isSending: boolean
  emptyLabel?: string
  disabled?: boolean
  disabledLabel?: string
}

function formatTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function SupportChatThread({
  messages,
  isLoading,
  viewerRole,
  onSend,
  isSending,
  emptyLabel = 'No messages yet — say hello.',
  disabled = false,
  disabledLabel,
}: SupportChatThreadProps) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    setDraft('')
    await onSend(body)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin text-text-muted" />
          </div>
        )}
        {!isLoading && (messages?.length ?? 0) === 0 && (
          <p className="py-8 text-center text-body-sm text-text-muted">{emptyLabel}</p>
        )}
        {messages?.map((message) => {
          const isMine = message.sender_role === viewerRole
          return (
            <div key={message.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-3 py-2 text-body-sm',
                  isMine ? 'bg-accent-blue text-white' : 'bg-bg-tertiary text-text-primary'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <p className={cn('mt-1 text-caption', isMine ? 'text-white/70' : 'text-text-muted')}>
                  {formatTime(message.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border-default p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={disabled ? disabledLabel : 'Type a message...'}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:border-border-focus disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button type="submit" size="sm" disabled={disabled || isSending || !draft.trim()}>
          {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </Button>
      </form>
    </div>
  )
}
