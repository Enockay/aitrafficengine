import { ACCENTS, STEPS } from './data'
import { Eyebrow } from './Eyebrow'

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-20 border-y border-border-default/50">
      <div className="landing-section-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="text-center">
          <Eyebrow>The pipeline</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">How it works</h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-text-secondary">
            Five steps from a URL to a tracked click back on your site.
          </p>
        </div>

        <div className="mt-20 grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">
          <div className="relative">
            <div className="pointer-events-none absolute left-[23px] top-0 hidden h-full w-px bg-gradient-to-b from-accent-red/30 via-border-default to-transparent md:block" />

            <div className="space-y-12 md:space-y-0">
              {STEPS.map((step, i) => {
                const accent = ACCENTS[i % ACCENTS.length]
                return (
                  <div
                    key={step.label}
                    className="relative grid gap-6 md:grid-cols-[48px_1fr] md:gap-10 md:py-10 md:first:pt-0 md:last:pb-0"
                  >
                    <div className="relative z-10 flex md:justify-center">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border-default bg-bg-secondary/80 shadow-[0_0_20px_-4px_rgba(229,72,77,0.15)] backdrop-blur-sm ${accent.text}`}
                      >
                        <step.icon size={20} />
                      </div>
                    </div>
                    <div className="md:pt-1.5">
                      <p className={`text-[11px] font-bold uppercase tracking-widest ${accent.text}`}>
                        Step {i + 1}
                      </p>
                      <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-text-primary">
                        {step.label}
                      </h3>
                      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-text-secondary">{step.text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="relative">
              <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-accent-purple/10 blur-2xl" />
              <div className="h-[420px] overflow-hidden rounded-2xl border border-border-default shadow-[0_24px_48px_-16px_rgba(0,0,0,0.5)] lg:h-[620px]">
                <img
                  src="/images/pipeline-code.jpg"
                  alt="Code editor generating platform-native posts"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
