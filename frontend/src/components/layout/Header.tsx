import { useLocation } from 'react-router-dom'
import { Menu, Zap } from 'lucide-react'

import { ALL_NAV_ITEMS } from '@/lib/nav'

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation()
  const current = ALL_NAV_ITEMS.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  )

  return (
    <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-border-default bg-bg-primary px-4 sm:px-6 lg:left-[260px]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Below lg the sidebar (and its logo) is hidden behind the drawer, so the
            header carries the brand instead of the current page's name. */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-red">
            <Zap size={14} className="text-white" fill="currentColor" />
          </div>
          <span className="text-h3 text-text-primary">AI Traffic Engine</span>
        </div>

        <div className="hidden lg:block">
          <p className="text-caption text-text-muted">AI Traffic Engine</p>
          <h1 className="text-h3 text-text-primary">{current?.label ?? 'Dashboard'}</h1>
        </div>
      </div>
      <p className="hidden text-body-sm text-text-secondary md:block">{TODAY}</p>
    </header>
  )
}
