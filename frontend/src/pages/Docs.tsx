import { Link } from 'react-router-dom'

import { Footer } from '@/components/landing/Footer'
import { Nav } from '@/components/landing/Nav'
import { ACCENTS, STEPS } from '@/components/landing/data'
import { PLATFORMS } from '@/components/landing/PlatformIcons'

export default function Docs() {
  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary antialiased">
      <div className="landing-atmosphere pointer-events-none fixed inset-0" />
      <div className="relative">
        <Nav />
        <main className="mx-auto max-w-3xl px-6 py-20 md:py-28">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-accent-red">Documentation</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary md:text-4xl">Getting started</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
            Everything below is the actual pipeline — add a site, and these five steps run on a schedule from
            there.
          </p>

          <div className="mt-14 space-y-10">
            {STEPS.map((step, i) => {
              const accent = ACCENTS[i % ACCENTS.length]
              return (
                <div key={step.label} className="flex gap-5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-default bg-bg-secondary/80 ${accent.text}`}
                  >
                    <step.icon size={18} />
                  </div>
                  <div>
                    <p className={`text-[11px] font-bold uppercase tracking-widest ${accent.text}`}>Step {i + 1}</p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight text-text-primary">{step.label}</h2>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">{step.text}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="landing-card mt-16 p-6">
            <h2 className="text-lg font-semibold text-text-primary">Connecting a platform</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
              Each platform is authorized through its own official OAuth 2.0 flow with PKCE — you approve access
              once, and the encrypted token is reused for every future post until you revoke it.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {PLATFORMS.map(({ name, Icon }) => (
                <div
                  key={name}
                  className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-tertiary/60 px-3 py-2 text-[13px] font-medium text-text-secondary"
                >
                  <Icon size={14} />
                  {name}
                </div>
              ))}
            </div>
          </div>

          <p className="mt-16 text-center text-[14px] text-text-secondary">
            Have a question that's not covered here? Check the{' '}
            <Link to="/#faq" className="font-medium text-accent-red hover:underline">
              FAQ
            </Link>
            .
          </p>
        </main>
        <Footer />
      </div>
    </div>
  )
}
