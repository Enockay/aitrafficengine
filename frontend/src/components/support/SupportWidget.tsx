import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LifeBuoy, MessageCircle, Search, Sparkles } from 'lucide-react'

import { SupportChatDrawer } from '@/components/support/SupportChatDrawer'

const SUPPORT_EMAIL = 'support@aitrafficengine.com'

export function SupportWidget() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

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
                  setChatOpen(true)
                }}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-body-sm text-text-primary transition-colors hover:bg-bg-tertiary"
              >
                <MessageCircle size={15} className="text-text-muted" />
                Contact us
              </button>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Suggestion for AI Traffic Engine')}`}
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
        </button>
      </div>

      <SupportChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  )
}
