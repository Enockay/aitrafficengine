import { Heart, MessageCircle, Repeat2, Share } from 'lucide-react'

interface TumblrPreviewProps {
  title: string
  body: string
  hashtags: string[]
  mediaUrl: string | null
  mediaType: 'image' | 'video' | null
}

export function TumblrPreview({ title, body, hashtags, mediaUrl, mediaType }: TumblrPreviewProps) {
  if (!title.trim() && !body.trim() && !mediaUrl) {
    return <p className="text-body-sm text-text-muted">Nothing to preview yet.</p>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-white text-black">
      <div className="flex items-center gap-2.5 p-3 pb-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#36465D] text-sm font-bold text-white">
          t
        </div>
        <div>
          <p className="text-sm font-semibold text-black">your-blog</p>
          <p className="text-xs text-gray-500">now</p>
        </div>
      </div>

      <div className="p-3">
        {title.trim() && <p className="mb-1.5 text-base font-semibold leading-snug text-black">{title}</p>}
        {body.trim() && (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">{body}</p>
        )}
      </div>

      {mediaUrl &&
        (mediaType === 'video' ? (
          <video src={mediaUrl} className="max-h-80 w-full object-cover" muted controls />
        ) : (
          <img src={mediaUrl} alt="" className="max-h-80 w-full object-cover" />
        ))}

      {hashtags.length > 0 && (
        <p className="px-3 pt-2 text-sm text-[#0093E9]">{hashtags.map((h) => `#${h}`).join(' ')}</p>
      )}

      <div className="mt-2.5 flex items-center gap-4 border-t border-black/10 px-3 py-2 text-gray-500">
        <span className="flex items-center gap-1 text-xs font-medium">
          <MessageCircle size={16} /> Reply
        </span>
        <span className="flex items-center gap-1 text-xs font-medium">
          <Repeat2 size={16} /> Reblog
        </span>
        <span className="flex items-center gap-1 text-xs font-medium">
          <Heart size={16} /> Like
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs font-medium">
          <Share size={16} />
        </span>
      </div>
    </div>
  )
}
