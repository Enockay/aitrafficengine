import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-border-default/50">
      <img
        src="/images/gradient-bg.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen"
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 bg-bg-primary/70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgba(229,72,77,0.22),transparent_65%)]" />

      <div className="relative mx-auto max-w-2xl px-6 py-24 text-center md:py-32">
        <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          Ready to put your content to work?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-text-secondary">
          Add a site and see the full pipeline run end to end — crawl, generate, publish, and track.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 px-8 text-[15px] shadow-lg shadow-accent-red/30">
            <Link to="/register">
              Get started free
              <ArrowRight size={17} />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 border-border-default bg-bg-secondary/60 px-8 text-[15px] backdrop-blur-sm">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
