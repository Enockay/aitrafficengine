import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LifeBuoy, MessageCircle, Search, Sparkles } from 'lucide-react'

import { SupportChatDrawer } from '@/components/support/SupportChatDrawer'
import { useSupportContactEmailQuery, useSupportUnread } from '@/hooks/useSupportChat'

// Fallback only for the instant a fresh session hasn't fetched /support/contact-email
// yet — the real address is admin-set in Integrations > Support.
const FALLBACK_SUPPORT_EMAIL = 'support@aitrafficengine.com'

export function SupportWidget() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const { data: contactEmail } = useSupportContactEmailQuery()
  const supportEmail = contactEmail ?? FALLBACK_SUPPORT_EMAIL
  const { hasUnread, markRead } = useSupportUnread()

  function openChat() {
    setChatOpen(true)
    markRead()
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-30">
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
            <div className="absolute bottom-14 right-0 z-40 w-56 overflow-hidden rounded-lg border border-border-default bg-bg-secondary shadow-2xl">
              <Link
                to="/docs"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-body-sm text-text-primary transition-colors hover:bg-bg-tertiary"
              >
                <Search size={15} className="text-text-muted" />
                Find answers
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  openChat()
                }}
                className="flex w-full items-center justify-between gap-2.5 px-4 py-3 text-left text-body-sm text-text-primary transition-colors hover:bg-bg-tertiary"
              >
                <span className="flex items-center gap-2.5">
                  <MessageCircle size={15} className="text-text-muted" />
                  Contact us
                </span>
                {hasUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-accent-red" />}
              </button>
              <a
                href={`mailto:${supportEmail}?subject=${encodeURIComponent('Suggestion for AI Traffic Engine')}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-body-sm text-text-primary transition-colors hover:bg-bg-tertiary"
              >
                <Sparkles size={15} className="text-text-muted" />
                Suggest an improvement
              </a>
              <Link
                to="/support"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-body-sm text-text-primary transition-colors hover:bg-bg-tertiary"
              >
                <LifeBuoy size={15} className="text-text-muted" />
                Support page
              </Link>
            </div>
          </>
        )}

        <button
          onClick={() => setMenuOpen((open) => !open)}
          className="relative z-40 flex items-center gap-2 rounded-full bg-accent-blue px-5 py-3 text-button font-medium text-white shadow-lg transition-transform hover:scale-105"
        >
          <LifeBuoy size={16} />
          Support
          {hasUnread && (
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-bg-primary bg-accent-red">
              <span className="absolute h-full w-full animate-ping rounded-full bg-accent-red opacity-75" />
            </span>
          )}
        </button>
      </div>

      <SupportChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  )
}
