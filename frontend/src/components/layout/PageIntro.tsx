import { Link } from 'react-router-dom'
import { Info, X } from 'lucide-react'

import { useDismissed } from '@/hooks/useDismissed'

interface PageIntroProps {
  storageKey: string
  description: string
  linkTo?: string
  linkLabel?: string
}

export function PageIntro({ storageKey, description, linkTo, linkLabel }: PageIntroProps) {
  const { dismissed, dismiss } = useDismissed(`page-intro:${storageKey}`)

  if (dismissed) return null

  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-border-default bg-bg-secondary/50 p-3">
      <Info size={16} className="mt-0.5 shrink-0 text-accent-blue" />
      <p className="flex-1 text-body-sm text-text-secondary">
        {description}
        {linkTo && linkLabel && (
          <>
            {' '}
            <Link to={linkTo} className="text-accent-blue hover:underline">
              {linkLabel}
            </Link>
          </>
        )}
      </p>
      <button
        type="button"
        title="Dismiss"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
      >
        <X size={14} />
      </button>
    </div>
  )
}
