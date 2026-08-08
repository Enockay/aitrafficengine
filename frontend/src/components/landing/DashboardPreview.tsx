import { CheckCircle2 } from 'lucide-react'

export function DashboardPreview() {
  return (
    <div className="relative mx-auto max-w-6xl [perspective:1200px]">
      <div
        className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.35)] ring-1 ring-white/10 transition-transform duration-700 hover:[transform:rotateX(2deg)]"
        style={{ transform: 'rotateX(4deg)' }}
      >
        <img
          src="/images/display.png"
          alt="AI Traffic Engine dashboard"
          className="block h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="landing-float-loop absolute -bottom-5 -left-4 z-10 hidden items-center gap-3 rounded-xl border border-border-default bg-bg-secondary/90 px-4 py-3 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md sm:flex">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-green/15 text-accent-green">
          <CheckCircle2 size={17} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-text-primary">Post published</p>
          <p className="text-[11px] text-text-muted">X / Twitter · just now</p>
        </div>
      </div>

      <div className="landing-float-loop-delay absolute -right-3 top-8 z-10 hidden rounded-xl border border-border-default bg-bg-secondary/90 px-4 py-3 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.5)] backdrop-blur-md md:block">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Next scheduled</p>
        <p className="mt-0.5 text-[13px] font-semibold text-text-primary">Today, 2:00 PM</p>
        <p className="text-[11px] text-text-muted">LinkedIn · 3 variants</p>
      </div>
    </div>
  )
}
