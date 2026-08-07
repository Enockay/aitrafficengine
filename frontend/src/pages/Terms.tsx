import { Footer } from '@/components/landing/Footer'
import { Nav } from '@/components/landing/Nav'
import { useSeo } from '@/hooks/useSeo'

const LAST_UPDATED = 'August 7, 2026'
const CONTACT_EMAIL = 'enockaymwema@gmail.com'

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'accounts', label: 'Your account' },
  { id: 'acceptable-use', label: 'Acceptable use & platform compliance' },
  { id: 'ai-content', label: 'AI-generated content' },
  { id: 'subscriptions', label: 'Subscriptions & billing' },
  { id: 'ownership', label: 'Content ownership' },
  { id: 'availability', label: 'Service availability' },
  { id: 'termination', label: 'Termination' },
  { id: 'liability', label: 'Limitation of liability' },
  { id: 'changes', label: 'Changes to these terms' },
  { id: 'contact', label: 'Contact us' },
]

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border-default/60 pt-8">
      <h2 className="text-xl font-semibold tracking-tight text-text-primary">{title}</h2>
      <div className="mt-3 space-y-3 text-[14.5px] leading-relaxed text-text-secondary">{children}</div>
    </section>
  )
}

export default function Terms() {
  useSeo({
    title: 'Terms of Service — AI Traffic Engine',
    description: 'The terms governing your use of AI Traffic Engine — accounts, acceptable use, billing, and content ownership.',
    path: '/terms',
  })

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary antialiased">
      <div className="landing-atmosphere pointer-events-none fixed inset-0" />
      <div className="relative">
        <Nav />
        <main className="mx-auto max-w-3xl px-6 py-20 md:py-28">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-accent-red">Legal</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary md:text-4xl">Terms of Service</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
            Last updated {LAST_UPDATED}. By creating an account you agree to these terms — read them alongside our{' '}
            <a href="/privacy" className="font-medium text-accent-red hover:underline">
              Privacy Policy
            </a>
            .
          </p>

          <div className="landing-card mt-8 p-5">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-text-muted">On this page</p>
            <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-[13.5px] text-accent-red hover:underline">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 space-y-8">
            <Section id="overview" title="Overview">
              <p>
                AI Traffic Engine ("we", "our", "the service") lets you crawl websites you own, generate
                AI-drafted posts and flyer images from that content, and publish them to X, LinkedIn, Reddit,
                Tumblr, and Pinterest through each platform's official API. These terms govern your use of the
                service — they don't cover the third-party platforms themselves, which have their own terms you
                remain responsible for following.
              </p>
            </Section>

            <Section id="accounts" title="Your account">
              <p>
                You're responsible for keeping your login credentials secure and for everything that happens
                under your account, including actions taken by anyone you give access to. You must be at least
                18, or the age of majority in your jurisdiction, to create an account. Tell us right away if you
                suspect unauthorized access.
              </p>
            </Section>

            <Section id="acceptable-use" title="Acceptable use & platform compliance">
              <p>
                You may only connect accounts and crawl sites you own or have explicit authorization to manage.
                You're solely responsible for ensuring content generated and published through your account
                complies with the terms of service, community guidelines, and applicable law of every platform
                you connect — X, LinkedIn, Reddit, Tumblr, and Pinterest each have their own rules on automation,
                spam, and self-promotion, and we don't police your compliance with them.
              </p>
              <p>
                We may suspend or terminate an account we reasonably believe is being used to spam, harass,
                infringe intellectual property, or otherwise abuse a connected platform or this service.
              </p>
            </Section>

            <Section id="ai-content" title="AI-generated content">
              <p>
                Posts, hashtags, and flyer copy are drafted by an AI model from your page content and may contain
                inaccuracies — nothing publishes without landing in your review queue first, unless you've
                explicitly enabled auto-scheduling for that content. You're responsible for reviewing generated
                content before it goes out under your name.
              </p>
            </Section>

            <Section id="subscriptions" title="Subscriptions & billing">
              <p>
                Paid plans are billed monthly in advance and metered by posts and flyers generated, not seats.
                Payments are processed by Paystack — we don't store your card details ourselves. You can upgrade,
                downgrade, or cancel anytime from Billing; changes to a lower tier take effect at the start of
                your next billing cycle, and we don't provide partial refunds for unused time in the current one.
              </p>
            </Section>

            <Section id="ownership" title="Content ownership">
              <p>
                You own the content on your sites and the posts generated from it. We claim no ownership over
                your generated posts, flyers, or the underlying site content — we only need the license to
                process it in order to run the service (crawling, generation, and publishing on your behalf).
              </p>
            </Section>

            <Section id="availability" title="Service availability">
              <p>
                We aim for reliable uptime but don't guarantee the service, or any third-party platform's API
                it depends on, will be available without interruption. Scheduled posts that fail to publish are
                retried automatically and surfaced in your queue with the failure reason if retries are
                exhausted.
              </p>
            </Section>

            <Section id="termination" title="Termination">
              <p>
                You can delete your account at any time from Settings. We may suspend or terminate accounts that
                violate these terms, with notice where practical. On termination, scheduled posts are cancelled
                and connected platform accounts are disconnected.
              </p>
            </Section>

            <Section id="liability" title="Limitation of liability">
              <p>
                The service is provided "as is." To the extent permitted by law, we're not liable for indirect,
                incidental, or consequential damages arising from your use of the service, including actions
                taken against your accounts by a connected platform as a result of content you approved for
                publishing.
              </p>
            </Section>

            <Section id="changes" title="Changes to these terms">
              <p>
                We'll update the "last updated" date above when these terms change and, for material changes,
                notify you by email before they take effect.
              </p>
            </Section>

            <Section id="contact" title="Contact us">
              <p>
                Questions about these terms? Reach us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-accent-red hover:underline">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </Section>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}
