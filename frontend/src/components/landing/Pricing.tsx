import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Eyebrow } from './Eyebrow'

const TIERS = [
  {
    name: 'Starter',
    price: '$29',
    period: '/mo',
    description: 'For one site, getting the pipeline running end to end.',
    features: ['1 connected site', 'Up to 30 posts / mo', '10 flyers / mo', 'Weekly scheduling', 'Click analytics'],
    cta: 'Get started',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '$89',
    period: '/mo',
    description: 'For running this across multiple sites on a real schedule.',
    features: [
      'Up to 3 connected sites',
      'Up to 120 posts / mo',
      '40 flyers / mo',
      'Daily scheduling',
      'Trend-aware posting + A/B variants',
    ],
    cta: 'Get started',
    highlighted: true,
  },
  {
    name: 'Agency',
    price: '$249',
    period: '/mo',
    description: 'Higher volume across many brands, with room to grow.',
    features: [
      'Up to 10 connected sites',
      'Up to 400 posts / mo',
      '150 flyers / mo',
      'Team seats',
      'Priority support',
    ],
    cta: 'Get started',
    highlighted: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="relative scroll-mt-20">
      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">Simple, usage-based plans</h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-text-secondary">
            Every plan is metered by posts and flyers, not seats — pick the ceiling that fits how much you publish.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-7 ${
                tier.highlighted
                  ? 'border-accent-red/40 bg-bg-secondary/80 shadow-[0_24px_48px_-16px_rgba(229,72,77,0.25)]'
                  : 'landing-card'
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-red px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  Most interest
                </span>
              )}
              <h3 className="text-[17px] font-semibold text-text-primary">{tier.name}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">{tier.description}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-text-primary">{tier.price}</span>
                {tier.period && <span className="text-[13px] text-text-muted">{tier.period}</span>}
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-text-secondary">
                    <Check size={15} className="mt-0.5 shrink-0 text-accent-green" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={tier.highlighted ? 'default' : 'outline'}
                className="mt-7 h-11 w-full border-border-default text-[14px]"
              >
                <Link to="/register">
                  {tier.cta}
                  <ArrowRight size={15} />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-lg text-center text-[13px] text-text-muted">
          Posts beyond your plan's monthly cap publish at $0.30/post. No overage on flyers or generation —
          those never run out mid-month.
        </p>
      </div>
    </section>
  )
}
