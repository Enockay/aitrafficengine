import { CalendarClock, CheckCircle2, Hash, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { Post } from '@/types/post'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  draft: 'neutral',
  approved: 'info',
  scheduled: 'warning',
  published: 'success',
  failed: 'error',
}

const PLATFORM_LABEL: Record<string, string> = {
  twitter: 'X / Twitter',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  tumblr: 'Tumblr',
  pinterest: 'Pinterest',
}

const PLATFORM_DOT: Record<string, string> = {
  twitter: 'bg-text-primary',
  linkedin: 'bg-accent-blue',
  reddit: 'bg-accent-red',
  tumblr: 'bg-[#2c3e50]',
  pinterest: 'bg-accent-red',
}

function relativeTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface PostCardProps {
  post: Post
  pageTitle?: string
  onView: () => void
  onApprove: () => void
  onDelete: () => void
}

export function PostCard({ post, pageTitle, onView, onApprove, onDelete }: PostCardProps) {
  const preview = post.title ?? post.body ?? '(empty post)'
  const timestamp = post.status === 'published' && post.published_at ? post.published_at : post.created_at
  const timestampLabel = post.status === 'published' ? 'Published' : post.status === 'scheduled' ? 'Queued' : 'Drafted'

  return (
    <div className="group overflow-hidden rounded-lg border border-border-default bg-bg-secondary shadow-sm transition-all hover:-translate-y-0.5 hover:border-border-focus/60 hover:shadow-md">
      <button type="button" onClick={onView} className="block w-full text-left">
        <div className="p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PLATFORM_DOT[post.platform] ?? 'bg-text-muted'}`} />
              <span className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
                {PLATFORM_LABEL[post.platform] ?? post.platform}
              </span>
              {post.variant_label && <Badge variant="neutral">Variant {post.variant_label}</Badge>}
            </div>
            <Badge variant={STATUS_VARIANT[post.status] ?? 'neutral'}>{post.status}</Badge>
          </div>
          {pageTitle && <p className="mb-1 truncate text-caption text-text-muted">from {pageTitle}</p>}
          <p className="line-clamp-3 text-body-sm text-text-primary">{preview}</p>
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-border-default px-4 py-2.5">
        <div className="flex items-center gap-3 text-caption text-text-muted">
          <span className="flex items-center gap-1">
            <Hash size={12} />
            {post.hashtags?.length ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <CalendarClock size={12} />
            {timestampLabel} {relativeTime(timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
          {post.status === 'draft' && (
            <button
              type="button"
              title="Approve"
              onClick={onApprove}
              className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-accent-green"
            >
              <CheckCircle2 size={14} />
            </button>
          )}
          <button
            type="button"
            title="Delete"
            onClick={onDelete}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-accent-red"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
