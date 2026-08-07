import { Link } from 'react-router-dom'

import { Logo } from './Logo'

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Integrations', href: '/#integrations' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Docs', href: '/docs' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Sign in', href: '/login' },
      { label: 'Get started', href: '/register' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border-default/50 bg-bg-surface/50 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:gap-12">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-text-secondary">
              Crawl your sites, let AI write and design the posts, and publish to X, LinkedIn, Reddit, Tumblr, and
              Pinterest on a schedule — with every click tracked back to you.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">{col.heading}</p>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) =>
                  link.href.startsWith('#') ? (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-[14px] text-text-secondary transition-colors hover:text-text-primary"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <Link
                        to={link.href}
                        className="text-[14px] text-text-secondary transition-colors hover:text-text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-border-default/50 pt-8 sm:flex-row">
          <p className="text-[13px] text-text-muted">
            &copy; {new Date().getFullYear()} AI Traffic Engine. All rights reserved.
          </p>
          <p className="text-[13px] text-text-muted">Zero ad spend · Official APIs only</p>
        </div>
      </div>
    </footer>
  )
}
