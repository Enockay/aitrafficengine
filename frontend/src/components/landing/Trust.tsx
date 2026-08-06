import { PRINCIPLES } from './data'
import { Eyebrow } from './Eyebrow'

export function Trust() {
  return (
    <section className="relative border-y border-border-default/50">
      <div className="landing-section-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>Trust</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
              Built to stay compliant
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-text-secondary">
              Automated distribution that doesn't put your accounts at risk — every publish goes through each
              platform's real, documented API, with the same click data you'd see in your own analytics.
            </p>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-accent-red/10 blur-2xl" />
            <div className="overflow-hidden rounded-2xl border border-border-default shadow-[0_24px_48px_-16px_rgba(0,0,0,0.5)]">
              <img
                src="/images/analytics-dashboard.png"
                alt="Click analytics dashboard showing real traffic data"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p) => (
            <div
              key={p.title}
              className="landing-card p-6 transition-all hover:border-accent-green/20 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.4)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-default bg-bg-tertiary/60 text-accent-green">
                <p.icon size={18} />
              </div>
              <h3 className="mt-5 text-[15px] font-semibold text-text-primary">{p.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
