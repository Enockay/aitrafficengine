import { ShieldCheck } from 'lucide-react'

import { PLATFORMS } from './PlatformIcons'
import { Eyebrow } from './Eyebrow'

const INTEGRATION_DETAILS: Record<string, string> = {
  'X / Twitter':
    "Publishes proper threads — each tweet under 280 characters, no manual numbering — with a hook built into the first tweet.",
  LinkedIn:
    'Publishes as a native post, written to survive the "see more" cutoff and tuned for a professional feed.',
  Reddit:
    "Publishes as a self-post, checked against subreddit rules and account karma before submitting — written first-person, never like an ad.",
}

export function Integrations() {
  return (
    <section id="integrations" className="relative scroll-mt-20 border-y border-border-default/50">
      <div className="landing-section-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="text-center">
          <Eyebrow>Integrations</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Connects to where your audience already is
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-text-secondary">
            Authorize once through each platform's real API — no scraping, no headless-browser workarounds.
          </p>
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:items-stretch lg:gap-14">
          <div className="flex flex-col gap-4">
            {PLATFORMS.map(({ name, Icon }) => (
              <div
                key={name}
                className="landing-card flex-1 p-6 transition-all hover:border-border-default/80"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-default bg-bg-tertiary/60 text-text-primary">
                  <Icon size={20} />
                </div>
                <h3 className="mt-5 text-[15px] font-semibold text-text-primary">{name}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{INTEGRATION_DETAILS[name]}</p>
              </div>
            ))}
          </div>

          <div className="relative h-full">
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-accent-red/10 blur-3xl" />
            <div className="h-full overflow-hidden rounded-2xl border border-border-default shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
              <img
                src="/images/integrations.jpg"
                alt="AI Traffic Engine core connecting to X, LinkedIn, and Reddit"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-lg items-center justify-center gap-2 text-[13px] font-medium text-text-muted">
          <ShieldCheck size={15} className="text-accent-green" />
          OAuth 2.0 with PKCE — you authorize once, tokens are encrypted at rest.
        </div>
      </div>
    </section>
  )
}
