import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'

import { ADMIN_NAV_ITEMS } from '@/lib/nav'

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

interface AdminHeaderProps {
  onMenuClick: () => void
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const location = useLocation()
  const current = [...ADMIN_NAV_ITEMS]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => location.pathname.startsWith(item.path))

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

        <div className="lg:hidden">
          <span className="text-h3 text-text-primary">Admin</span>
        </div>

        <div className="hidden lg:block">
          <p className="text-caption text-text-muted">Admin</p>
          <h1 className="text-h3 text-text-primary">{current?.label ?? 'Overview'}</h1>
        </div>
      </div>
      <p className="hidden text-body-sm text-text-secondary md:block">{TODAY}</p>
    </header>
  )
}
