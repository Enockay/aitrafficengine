import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

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

function NavCTAs() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return (
      <Button asChild size="sm">
        <Link to="/dashboard">
          Go to Dashboard
          <ArrowRight size={14} />
        </Link>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm" className="border-border-default">
        <Link to="/login">Sign in</Link>
      </Button>
      <Button asChild size="sm">
        <Link to="/register">
          Get started
          <ArrowRight size={14} />
        </Link>
      </Button>
    </div>
  )
}

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border-default/50 bg-bg-primary/60 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Logo expanded />
        <nav className="hidden items-center gap-7 lg:flex">
          {LINKS.map((link) =>
            link.route ? (
              <Link
                key={link.href}
                to={link.href}
                className="text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                {link.label}
              </a>
            )
          )}
        </nav>
        <NavCTAs />
      </div>
    </header>
  )
}
