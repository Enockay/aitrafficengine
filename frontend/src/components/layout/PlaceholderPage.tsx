import { Construction, type LucideIcon } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description: string
  phase: string
  icon?: LucideIcon
  emptyTitle?: string
}

export function PlaceholderPage({
  title,
  description,
  phase,
  icon: Icon = Construction,
  emptyTitle,
}: PlaceholderPageProps) {
  return (
    <div>
      <h1 className="text-h1 text-text-primary">{title}</h1>
      <div className="mt-6 flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-border-default bg-bg-secondary/40 px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bg-tertiary">
          <Icon size={24} className="text-accent-red" />
        </div>
        <h2 className="text-h3 text-text-primary">{emptyTitle ?? `${title} is on the way`}</h2>
        <p className="mt-2 max-w-sm text-body text-text-secondary">{description}</p>
        <span className="mt-4 inline-flex items-center rounded-full bg-accent-yellow/10 px-3 py-1 text-caption font-medium text-accent-yellow">
          {phase}
        </span>
      </div>
    </div>
  )
}
