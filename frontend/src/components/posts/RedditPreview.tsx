import { ArrowBigDown, ArrowBigUp, MessageSquare, Share2 } from 'lucide-react'

interface RedditPreviewProps {
  title: string
  body: string
}

export function RedditPreview({ title, body }: RedditPreviewProps) {
  if (!title.trim() && !body.trim()) {
    return <p className="text-body-sm text-text-muted">Nothing to preview yet.</p>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-white text-black">
      <div className="flex gap-3 p-3">
        <div className="flex shrink-0 flex-col items-center gap-0.5 text-gray-400">
          <ArrowBigUp size={20} />
          <span className="text-xs font-bold text-gray-600">1</span>
          <ArrowBigDown size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs text-gray-500">
            <span className="font-semibold text-black">r/community</span> · Posted by u/yourbrand · now
          </p>
          <p className="mb-1.5 text-base font-medium leading-snug text-black">{title || 'Untitled post'}</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">{body}</p>
          <div className="mt-2.5 flex items-center gap-4 text-xs font-bold text-gray-500">
            <span className="flex items-center gap-1">
              <MessageSquare size={14} /> Comments
            </span>
            <span className="flex items-center gap-1">
              <Share2 size={14} /> Share
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
