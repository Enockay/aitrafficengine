import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Menu, X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { Logo } from './Logo'

const LINKS = [
  { href: '/#features', label: 'Features', route: false },
  { href: '/#how-it-works', label: 'How it works', route: false },
  { href: '/#integrations', label: 'Integrations', route: false },
  { href: '/#pricing', label: 'Pricing', route: false },
  { href: '/docs', label: 'Docs', route: true },
  { href: '/#faq', label: 'FAQ', route: false },
]

function NavLinks({ className, onNavigate }: { className: string; onNavigate?: () => void }) {
  return (
    <>
      {LINKS.map((link) =>
        link.route ? (
          <Link key={link.href} to={link.href} onClick={onNavigate} className={className}>
            {link.label}
          </Link>
        ) : (
          <a key={link.href} href={link.href} onClick={onNavigate} className={className}>
            {link.label}
          </a>
        )
      )}
    </>
  )
}

function NavCTAs({ onNavigate, stacked = false }: { onNavigate?: () => void; stacked?: boolean }) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return (
      <Button asChild size="sm" className={stacked ? 'w-full' : undefined} onClick={onNavigate}>
        <Link to="/dashboard">
          Go to Dashboard
          <ArrowRight size={14} />
        </Link>
      </Button>
    )
  }

  return (
    <div className={stacked ? 'flex flex-col gap-2' : 'flex items-center gap-2'}>
      <Button
        asChild
        variant="outline"
        size="sm"
        className={`border-border-default ${stacked ? 'w-full' : ''}`}
        onClick={onNavigate}
      >
        <Link to="/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" className={stacked ? 'w-full' : undefined} onClick={onNavigate}>
        <Link to="/register">
          Get started
          <ArrowRight size={14} />
        </Link>
      </Button>
    </div>
  )
}

export function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-border-default/50 bg-bg-primary/60 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo expanded />
        <nav className="hidden items-center gap-7 lg:flex">
          <NavLinks className="text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary" />
        </nav>
        <div className="hidden lg:block">
          <NavCTAs />
        </div>

        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Trigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary lg:hidden"
            >
              <Menu size={20} />
            </button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
            <DialogPrimitive.Content
              aria-describedby={undefined}
              className="fixed inset-x-0 top-0 z-50 max-h-screen overflow-y-auto border-b border-border-default bg-bg-primary p-6 pt-20 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top lg:hidden"
            >
              <DialogPrimitive.Title className="sr-only">Navigation menu</DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close menu"
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
              >
                <X size={20} />
              </DialogPrimitive.Close>

              <nav className="flex flex-col gap-1">
                <NavLinks
                  onNavigate={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-body font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                />
              </nav>
              <div className="mt-4 border-t border-border-default pt-4">
                <NavCTAs stacked onNavigate={() => setOpen(false)} />
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </header>
  )
}
