import { MessageCircle, Repeat2, Send, ThumbsUp, UserRound } from 'lucide-react'

interface LinkedInPreviewProps {
  body: string
  hashtags: string[]
}

export function LinkedInPreview({ body, hashtags }: LinkedInPreviewProps) {
  if (!body.trim()) {
    return <p className="text-body-sm text-text-muted">Nothing to preview yet.</p>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-white p-4 text-[#000000]">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-200">
          <UserRound size={20} className="text-gray-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-black">Your Brand</p>
          <p className="text-xs text-gray-500">1,234 followers</p>
          <p className="text-xs text-gray-500">now</p>
        </div>
      </div>

      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-black/90">{body}</p>

      {hashtags.length > 0 && (
        <p className="mt-2 text-sm font-medium text-[#0A66C2]">{hashtags.map((h) => `#${h}`).join(' ')}</p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-2 text-gray-500">
        <div className="flex items-center gap-1.5 text-xs">
          <ThumbsUp size={14} /> Like
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <MessageCircle size={14} /> Comment
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Repeat2 size={14} /> Repost
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Send size={14} /> Send
        </div>
      </div>
    </div>
  )
}
