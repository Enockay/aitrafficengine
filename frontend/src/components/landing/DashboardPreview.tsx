import { CheckCircle2 } from 'lucide-react'

import { PLATFORMS } from './PlatformIcons'

export function DashboardPreview() {
  return (
    <div className="relative mx-auto max-w-4xl [perspective:1200px]">
      <div
        className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.35)] ring-1 ring-white/10 transition-transform duration-700 hover:[transform:rotateX(2deg)]"
        style={{ transform: 'rotateX(4deg)' }}
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/90 px-5 py-3.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <div className="ml-4 flex-1 rounded-md bg-zinc-800/80 px-3 py-1">
            <span className="text-[11px] text-zinc-500">aitrafficengine.com/dashboard</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
          {[
            { label: 'Total posts', value: '3', accent: 'text-accent-red' },
            { label: 'Total clicks', value: '128', accent: 'text-zinc-100' },
            { label: 'Active schedules', value: '2', accent: 'text-zinc-100' },
            { label: 'Connected', value: '1', accent: 'text-emerald-400' },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{m.label}</p>
              <p className={`mt-1.5 text-2xl font-bold tracking-tight ${m.accent}`}>{m.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 sm:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[13px] font-medium text-zinc-200">Traffic overview</p>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                +24% this week
              </span>
            </div>
            <svg viewBox="0 0 300 80" className="h-24 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e5484d" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#e5484d" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon
                points="0,80 0,65 40,60 80,45 120,50 160,25 200,32 240,12 300,18 300,80"
                fill="url(#chart-fill)"
              />
              <polyline
                points="0,65 40,60 80,45 120,50 160,25 200,32 240,12 300,18"
                fill="none"
                stroke="#e5484d"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="space-y-2.5">
            {PLATFORMS.map(({ name, Icon }, i) => {
              const connected = i === 0
              return (
                <div key={name} className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 text-zinc-300">
                    <Icon size={15} />
                  </span>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{name}</p>
                    <p
                      className={`mt-0.5 flex items-center gap-1.5 text-[13px] font-medium ${connected ? 'text-emerald-400' : 'text-zinc-500'}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                      {connected ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
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
