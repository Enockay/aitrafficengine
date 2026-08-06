import { Link } from 'react-router-dom'

import { Footer } from '@/components/landing/Footer'
import { Nav } from '@/components/landing/Nav'

const LAST_UPDATED = 'August 6, 2026'
const CONTACT_EMAIL = 'enockaymwema@gmail.com'

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'information-we-collect', label: 'Information we collect' },
  { id: 'how-we-use-it', label: 'How we use it' },
  { id: 'third-parties', label: 'Third parties we share data with' },
  { id: 'cookies', label: 'Cookies & local storage' },
  { id: 'security', label: 'Data security' },
  { id: 'retention', label: 'Data retention' },
  { id: 'your-rights', label: 'Your rights' },
  { id: 'children', label: "Children's privacy" },
  { id: 'changes', label: 'Changes to this policy' },
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

export default function Privacy() {
  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary antialiased">
      <div className="landing-atmosphere pointer-events-none fixed inset-0" />
      <div className="relative">
        <Nav />
        <main className="mx-auto max-w-3xl px-6 py-20 md:py-28">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-accent-red">Legal</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary md:text-4xl">Privacy Policy</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
            Last updated {LAST_UPDATED}. This describes what AI Traffic Engine actually collects and does with
            it — not boilerplate, this is specific to how this product works.
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
                AI Traffic Engine crawls websites you own, uses AI to draft social posts and flyer images from
                that content, and publishes them to X, LinkedIn, and Reddit on your behalf through each
                platform's official API. This policy covers the data that pipeline touches: your account, the
                sites you add, the platform accounts you connect, and the posts and clicks that result.
              </p>
            </Section>

            <Section id="information-we-collect" title="Information we collect">
              <p>
                <span className="font-medium text-text-primary">Account information</span> — full name, email
                address, password (stored as a bcrypt hash, never in plain text), and optionally company name,
                phone number, and timezone, all provided at signup or later in Settings.
              </p>
              <p>
                <span className="font-medium text-text-primary">Site content</span> — when you add a site, we
                crawl the pages you point us at and store the title, meta description, hero image URL, and key
                points extracted from headers and bold text. We only crawl sites you tell us to, and we respect
                robots.txt.
              </p>
              <p>
                <span className="font-medium text-text-primary">Connected platform accounts</span> — when you
                connect X, LinkedIn, or Reddit, we store the OAuth access and refresh tokens issued to us,
                encrypted at rest, plus the account handle/name so we know what we're posting as. We never see
                or store your platform password — authorization happens entirely on the platform's own login
                page.
              </p>
              <p>
                <span className="font-medium text-text-primary">Generated content</span> — the posts and flyer
                images our AI drafts from your site content, along with which platform they were published to
                and when.
              </p>
              <p>
                <span className="font-medium text-text-primary">Click analytics</span> — every link we publish
                routes through a redirect on our own domain before landing on your page, so we log that a click
                happened (timestamp, which post it came from) as first-party data. This is not shared with or
                sourced from the platforms themselves.
              </p>
              <p>
                <span className="font-medium text-text-primary">Activity logs</span> — security-relevant actions
                on your account (login, logout, password changes, profile updates) are logged with a timestamp
                and the IP address the request came from, so you can review account activity and so we can
                detect abuse.
              </p>
            </Section>

            <Section id="how-we-use-it" title="How we use it">
              <p>
                We use this data to run the pipeline you signed up for: crawling your sites, generating posts
                and flyers, publishing them through your connected accounts on the schedule you set, and
                showing you the resulting click data. We do not sell your data, and we do not use it for
                advertising — there's no ad spend anywhere in this product, on your side or ours.
              </p>
            </Section>

            <Section id="third-parties" title="Third parties we share data with">
              <p>
                Running this pipeline means parts of your data pass through a small number of external
                services, each doing one specific job:
              </p>
              <ul className="list-inside list-disc space-y-1.5">
                <li>
                  <span className="font-medium text-text-primary">Anthropic (Claude)</span> — receives crawled
                  page content to draft platform-native post copy.
                </li>
                <li>
                  <span className="font-medium text-text-primary">Stability AI</span> — receives a text brief
                  to generate flyer background images.
                </li>
                <li>
                  <span className="font-medium text-text-primary">X, LinkedIn, and Reddit</span> — receive the
                  generated post content at publish time, through each platform's official API, using the OAuth
                  token you authorized.
                </li>
                <li>
                  <span className="font-medium text-text-primary">Brevo</span> — receives your email address and
                  name to send account emails (verification, password reset). We don't use it for marketing
                  email.
                </li>
              </ul>
              <p>None of these providers are permitted to use your data for their own purposes beyond that job.</p>
            </Section>

            <Section id="cookies" title="Cookies & local storage">
              <p>
                We set one HTTP-only cookie to keep your session signed in; it isn't readable by page scripts
                and isn't used for tracking across other sites. A refresh token is also kept in your browser's
                local storage so you stay signed in between visits — clearing your browser storage signs you
                out. We don't use third-party analytics or advertising cookies.
              </p>
            </Section>

            <Section id="security" title="Data security">
              <p>
                Passwords are hashed with bcrypt and never stored in reverse-able form. OAuth tokens for
                connected platforms are encrypted at rest. All traffic to and from the app is encrypted in
                transit (HTTPS). Access to production data is limited to what's needed to operate the service.
              </p>
            </Section>

            <Section id="retention" title="Data retention">
              <p>
                We keep your account data for as long as your account is active. If you delete your account, we
                remove your personal information and revoke stored platform tokens; some records (like activity
                logs tied to security events) may be retained briefly afterward where needed for fraud
                prevention or legal obligations.
              </p>
            </Section>

            <Section id="your-rights" title="Your rights">
              <p>
                You can review and update most of your account information directly in Settings, including your
                name, company, phone, and timezone. You can disconnect a platform account at any time from the
                Platforms page, which revokes our stored token for it. To request a copy of your data, ask us to
                correct something we got wrong, or delete your account entirely, contact us using the details
                below.
              </p>
            </Section>

            <Section id="children" title="Children's privacy">
              <p>
                AI Traffic Engine is intended for business use and is not directed at children. We don't
                knowingly collect information from anyone under 16.
              </p>
            </Section>

            <Section id="changes" title="Changes to this policy">
              <p>
                If this policy changes in a material way, we'll update the date at the top of this page. Continued
                use of AI Traffic Engine after a change means you accept the update.
              </p>
            </Section>

            <Section id="contact" title="Contact us">
              <p>
                Questions about this policy, or a data request — reach us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-accent-red hover:underline">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </Section>
          </div>

          <p className="mt-16 text-center text-[14px] text-text-secondary">
            Looking for something else? Check the{' '}
            <Link to="/docs" className="font-medium text-accent-red hover:underline">
              docs
            </Link>{' '}
            or the{' '}
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
