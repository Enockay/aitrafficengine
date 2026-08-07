import { NavLink } from 'react-router-dom'
import { ArrowLeft, LogOut, ShieldCheck, X } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { ADMIN_NAV_ITEMS, type NavItem } from '@/lib/nav'
import { cn, getInitials } from '@/lib/utils'

function AdminNavItemLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.path === '/admin'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-nav text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary',
          isActive && 'border-accent-red bg-bg-tertiary text-text-primary'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={17}
            className={cn(
              'shrink-0',
              isActive ? 'text-accent-red' : 'text-text-muted group-hover:text-text-secondary'
            )}
          />
          {item.label}
        </>
      )}
    </NavLink>
  )
}

interface AdminSidebarProps {
  open: boolean
  onClose: () => void
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const { user, logout } = useAuth()

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-border-default bg-bg-secondary transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2.5 border-b border-border-default px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-red">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div>
              <span className="text-h3 text-text-primary">Admin</span>
              <p className="text-caption text-text-muted">AI Traffic Engine</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:text-text-primary lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => (
              <AdminNavItemLink key={item.path} item={item} onNavigate={onClose} />
            ))}
          </div>

          <div className="mt-5 border-t border-border-default pt-3">
            <NavLink
              to="/dashboard"
              onClick={onClose}
              className="group flex items-center gap-3 rounded-md px-3 py-2 text-nav text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            >
              <ArrowLeft size={17} className="shrink-0 text-text-muted group-hover:text-text-secondary" />
              Back to app
            </NavLink>
          </div>
        </nav>

        <div className="border-t border-border-default p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-purple/20 text-body-sm font-semibold text-accent-purple">
              {getInitials(user?.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-medium text-text-primary">{user?.full_name}</p>
              <p className="truncate text-caption text-text-muted">{user?.email}</p>
            </div>
            <button
              type="button"
              title="Logout"
              onClick={() => logout()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-accent-red"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
