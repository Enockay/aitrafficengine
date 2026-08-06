import type { ReactNode } from 'react'
import { BarChart3, Rocket, Zap } from 'lucide-react'

const FEATURES = [
  { icon: Rocket, text: 'Automated content distribution across every platform' },
  { icon: Zap, text: 'AI-generated posts and branded flyers in seconds' },
  { icon: BarChart3, text: 'Real-time analytics on every click you earn' },
]

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg-primary">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-bg-secondary p-12 lg:flex">
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgb(var(--accent-red)), transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgb(var(--accent-purple)), transparent 70%)' }}
        />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-red">
            <Zap size={18} className="text-white" fill="currentColor" />
          </div>
          <span className="text-h3 text-text-primary">AI Traffic Engine</span>
        </div>

        <div className="relative space-y-8">
          <h1 className="max-w-md text-h1 text-text-primary">
            Turn your content into organic traffic, automatically.
          </h1>
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-bg-tertiary">
                  <Icon size={14} className="text-accent-red" />
                </div>
                <span className="text-body text-text-secondary">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-caption text-text-muted">
          Zero ad spend. Zero manual posting. 100% owned traffic.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">{children}</div>
    </div>
  )
}
