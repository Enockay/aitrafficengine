import { Link } from 'react-router-dom'

import { Footer } from '@/components/landing/Footer'
import { Nav } from '@/components/landing/Nav'
import { Pricing as PricingSection } from '@/components/landing/Pricing'
import { useSeo } from '@/hooks/useSeo'

const FAQS = [
  {
    q: 'What counts as a "post"?',
    a: 'Each generated draft for one platform — a tweet thread, a LinkedIn post, a Reddit self-post, a Tumblr post, or a Pinterest pin — counts as one post toward your plan\'s monthly limit, whether or not it ends up published.',
  },
  {
    q: 'What happens if I go over my limit?',
    a: "You'll be prompted to upgrade before you can generate more posts or flyers that month. Nothing you've already scheduled or published is affected.",
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes, upgrade or downgrade anytime from Billing — changes apply immediately and billing is prorated.',
  },
  {
    q: 'Is the 14-day trial really free?',
    a: 'Yes — no card required to start, and you get Growth-level access (3 sites, 120 posts/mo) for the full trial period.',
  },
]

export default function PricingPage() {
  useSeo({
    title: 'Pricing — AI Traffic Engine',
    description:
      'Simple, usage-based pricing for AI Traffic Engine — Starter at $20/mo, Growth at $49/mo, Agency at $149/mo. 14-day free trial, no card required.',
    path: '/pricing',
  })

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary antialiased">
      <div className="landing-atmosphere pointer-events-none fixed inset-0" />
      <div className="relative">
        <Nav />
        <main className="pt-8">
          <PricingSection />

          <div className="mx-auto max-w-3xl px-6 pb-24">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Pricing questions</h2>
            <div className="mt-8 space-y-6">
              {FAQS.map((faq) => (
                <div key={faq.q} className="landing-card p-5">
                  <p className="text-[15px] font-semibold text-text-primary">{faq.q}</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{faq.a}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-[14px] text-text-secondary">
              Still deciding?{' '}
              <Link to="/docs" className="font-medium text-accent-red hover:underline">
                See how the pipeline works
              </Link>{' '}
              or{' '}
              <Link to="/register" className="font-medium text-accent-red hover:underline">
                start your free trial
              </Link>
              .
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}
