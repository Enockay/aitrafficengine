import { ACCENTS, FEATURES } from './data'
import { Eyebrow } from './Eyebrow'

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-20">
      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="text-center">
          <Eyebrow>Capabilities</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">Everything you need</h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-text-secondary">
            From crawling to publishing to analytics — one pipeline, no ad spend.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => {
            const accent = ACCENTS[i % ACCENTS.length]
            return (
              <div
                key={feature.title}
                className="landing-card group p-7 transition-all duration-300 hover:border-border-default/80 hover:bg-bg-secondary/80 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)]"
              >
                <div
                  className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent.tile} ${accent.text}`}
                >
                  <feature.icon size={20} />
                </div>
                <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-text-primary">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-text-secondary">{feature.text}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
