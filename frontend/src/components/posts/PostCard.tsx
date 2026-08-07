import { CheckCircle2, Hash, Trash2 } from 'lucide-react'

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

interface PostCardProps {
  post: Post
  pageTitle?: string
  onView: () => void
  onApprove: () => void
  onDelete: () => void
}

export function PostCard({ post, pageTitle, onView, onApprove, onDelete }: PostCardProps) {
  const preview = post.title ?? post.body ?? '(empty post)'

  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-bg-secondary transition-colors hover:bg-bg-tertiary/40">
      <button type="button" onClick={onView} className="block w-full text-left">
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-caption font-medium uppercase text-text-muted">
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
        <div className="flex items-center gap-1 text-caption text-text-muted">
          <Hash size={12} />
          {post.hashtags?.length ?? 0}
        </div>
        <div className="flex items-center gap-1">
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
