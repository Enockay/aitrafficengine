import { Link } from 'react-router-dom'
import { ArrowRight, Globe, Link2, ShieldCheck, Sparkles, TrendingUp, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DashboardPreview } from './DashboardPreview'
import { PLATFORMS } from './PlatformIcons'

const HERO_STATS = [
  { value: '5-step', label: 'Crawl to publish' },
  { value: 'Trend-aware', label: 'Posts tied to what\'s live' },
  { value: '3×', label: 'Auto-retry on failure' },
  { value: '1st-party', label: 'Click tracking' },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[720px] overflow-hidden">
        <img
          src="/images/hero-network.jpg"
          alt=""
          className="h-full w-full object-cover object-[50%_25%] opacity-80"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-primary/30 via-bg-primary/55 to-bg-primary" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_38%,rgb(var(--bg-primary)/0.92),transparent_72%)]" />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[-120px] h-[520px] w-[800px] -translate-x-1/2 rounded-full bg-accent-red/10 blur-[100px]" />

      <div className="landing-float-a pointer-events-none absolute left-6 top-40 hidden w-[210px] rounded-2xl border border-border-default bg-bg-secondary/80 px-4 py-3.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md 2xl:block">
        <div className="flex items-center gap-1.5 text-accent-red">
          <Sparkles size={14} />
          <span className="text-[10px] font-bold uppercase tracking-wider">AI drafted</span>
        </div>
        <p className="mt-1.5 text-[12.5px] leading-snug text-text-secondary">
          Platform-native post generated in under 10 seconds.
        </p>
      </div>

      <div className="landing-float-b pointer-events-none absolute right-6 top-[420px] hidden w-[210px] rounded-2xl border border-border-default bg-bg-secondary/80 px-4 py-3.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md 2xl:block">
        <div className="flex items-center gap-1.5 text-accent-green">
          <Link2 size={14} />
          <span className="text-[10px] font-bold uppercase tracking-wider">First-party tracking</span>
        </div>
        <p className="mt-1.5 text-[12.5px] leading-snug text-text-secondary">
          Every click routes through your own domain before landing on the page.
        </p>
      </div>

      <div className="relative mx-auto max-w-5xl px-6 pb-4 pt-20 text-center md:pt-28">
        <div className="landing-fade-up mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-secondary/80 px-4 py-1.5 text-[13px] font-medium text-text-secondary backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-red opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-red" />
          </span>
          Auto-managed traffic, powered by AI
        </div>

        <h1 className="landing-fade-up-delay-1 mx-auto max-w-4xl text-[2.5rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-text-primary sm:text-5xl md:text-[3.5rem] md:leading-[1.05]">
          Put your website's traffic on{' '}
          <span className="landing-gradient-text">autopilot</span>.
        </h1>

        <p className="landing-fade-up-delay-2 mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-text-secondary md:text-lg">
          Add your site once — the AI takes it from there, automatically, with zero ad spend.
        </p>

        <div className="landing-fade-up-delay-2 mx-auto mt-9 flex max-w-4xl flex-wrap items-center justify-center gap-y-5 rounded-2xl border border-border-default bg-bg-secondary/60 px-5 py-5 backdrop-blur-sm sm:flex-nowrap sm:gap-x-2 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary text-accent-red">
              <Globe size={16} />
            </span>
            <span className="text-left text-[13px] font-medium leading-tight text-text-secondary">
              Your
              <br />
              site
            </span>
          </div>
          <ArrowRight size={16} className="mx-2 hidden shrink-0 text-text-muted sm:block" />
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary text-accent-purple">
              <Sparkles size={16} />
            </span>
            <span className="text-left text-[13px] font-medium leading-tight text-text-secondary">
              AI writes &amp;
              <br />
              spots trends
            </span>
          </div>
          <ArrowRight size={16} className="mx-2 hidden shrink-0 text-text-muted sm:block" />
          <div className="flex items-center gap-2.5">
            <span className="flex items-center -space-x-1.5">
              {PLATFORMS.map(({ name, Icon }) => (
                <span
                  key={name}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border-default bg-bg-tertiary text-text-secondary ring-2 ring-bg-secondary"
                >
                  <Icon size={13} />
                </span>
              ))}
            </span>
            <span className="text-left text-[13px] font-medium leading-tight text-text-secondary">
              Auto-posted
              <br />
              on schedule
            </span>
          </div>
          <ArrowRight size={16} className="mx-2 hidden shrink-0 text-text-muted sm:block" />
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary text-accent-green">
              <TrendingUp size={16} />
            </span>
            <span className="text-left text-[13px] font-medium leading-tight text-text-secondary">
              Traffic back
              <br />
              to you
            </span>
          </div>
        </div>

        <div className="landing-fade-up-delay-3 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
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

        <div className="landing-fade-up-delay-3 mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-text-muted">
            <Zap size={15} className="text-accent-red/80" />
            Zero ad spend
          </div>
          <div className="flex items-center gap-2 text-[13px] font-medium text-text-muted">
            <ShieldCheck size={15} className="text-accent-red/80" />
            Official APIs only
          </div>
        </div>

        <div className="landing-fade-up-delay-3 mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border-default bg-border-default/60 sm:grid-cols-4">
          {HERO_STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-bg-secondary/70 px-4 py-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-bg-secondary"
            >
              <p className="text-xl font-bold tracking-tight text-text-primary md:text-2xl">{stat.value}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-12 md:pb-32 md:pt-16">
        <DashboardPreview />
      </div>
    </section>
  )
}
