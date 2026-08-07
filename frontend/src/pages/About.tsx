import { Link } from 'react-router-dom'
import { Globe, Link2, ShieldCheck, Zap } from 'lucide-react'

import { Footer } from '@/components/landing/Footer'
import { Nav } from '@/components/landing/Nav'
import { useSeo } from '@/hooks/useSeo'

const VALUES = [
  {
    icon: Zap,
    title: 'Automation over ad spend',
    text: "Every dollar you'd otherwise put into ads goes back into your product instead — the traffic loop runs on your own content, not a media budget.",
  },
  {
    icon: ShieldCheck,
    title: "Official APIs, always",
    text: "Every post goes out through each platform's real, documented API using OAuth you explicitly grant — never scraping, never simulated clicks, never an approach that risks your accounts.",
  },
  {
    icon: Link2,
    title: 'First-party tracking',
    text: 'Every link we publish routes through a redirect on your own domain before landing on your page, so the click data is yours — not something we infer or buy back from a platform.',
  },
  {
    icon: Globe,
    title: 'Built for real sites',
    text: "This isn't a content-mill tool for pages that don't exist yet — it crawls what you've already published and works from there.",
  },
]

export default function About() {
  useSeo({
    title: 'About — AI Traffic Engine',
    description:
      "AI Traffic Engine turns a website you already run into a self-driving distribution channel — AI drafts platform-native posts from your own content and publishes them on a schedule, with zero ad spend.",
    path: '/about',
  })

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary antialiased">
      <div className="landing-atmosphere pointer-events-none fixed inset-0" />
      <div className="relative">
        <Nav />
        <main className="mx-auto max-w-3xl px-6 py-20 md:py-28">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-accent-red">About</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Traffic shouldn't require a media budget
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
            Most of what a growing site publishes never leaves the site. AI Traffic Engine exists to close that
            gap — it crawls the pages you've already written, drafts platform-native posts from them with AI, and
            publishes on a schedule you set, so the content you already made keeps working after the day you hit
            publish.
          </p>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {VALUES.map((value) => (
              <div key={value.title} className="landing-card p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-tertiary text-accent-red">
                  <value.icon size={16} />
                </div>
                <p className="mt-3 text-[15px] font-semibold text-text-primary">{value.title}</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-secondary">{value.text}</p>
              </div>
            ))}
          </div>

          <div className="landing-card mt-14 p-6">
            <h2 className="text-lg font-semibold text-text-primary">How it's actually built</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
              The pipeline is five steps — crawl, generate, review, schedule, publish — and every step is visible
              and editable before anything goes out. Nothing posts automatically without landing in your queue
              first unless you explicitly turn on auto-scheduling. See the full breakdown on the{' '}
              <Link to="/docs" className="font-medium text-accent-red hover:underline">
                docs page
              </Link>
              .
            </p>
          </div>

          <p className="mt-16 text-center text-[14px] text-text-secondary">
            Ready to try it on your own site?{' '}
            <Link to="/register" className="font-medium text-accent-red hover:underline">
              Start free
            </Link>
            .
          </p>
        </main>
        <Footer />
      </div>
    </div>
  )
}
