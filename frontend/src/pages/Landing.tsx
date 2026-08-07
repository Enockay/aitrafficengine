import { CTA } from '@/components/landing/CTA'
import { FAQ } from '@/components/landing/FAQ'
import { Features } from '@/components/landing/Features'
import { Footer } from '@/components/landing/Footer'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Integrations } from '@/components/landing/Integrations'
import { Nav } from '@/components/landing/Nav'
import { Pricing } from '@/components/landing/Pricing'
import { Trust } from '@/components/landing/Trust'
import { useSeo } from '@/hooks/useSeo'

export default function Landing() {
  useSeo({
    title: 'AI Traffic Engine — Turn content into organic traffic',
    description:
      'Add your website once — AI crawls it, writes platform-native posts, and publishes to X, LinkedIn, Reddit, Tumblr, and Pinterest on a schedule. Every click tracked back to you. Zero ad spend.',
    path: '/',
  })

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary antialiased">
      <div className="landing-atmosphere pointer-events-none fixed inset-0" />
      <div className="relative">
        <Nav />
        <main>
          <Hero />
          <HowItWorks />
          <Features />
          <Integrations />
          <Trust />
          <Pricing />
          <FAQ />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  )
}
