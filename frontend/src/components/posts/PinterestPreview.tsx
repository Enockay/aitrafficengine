import { AlertTriangle, MoreHorizontal, Share } from 'lucide-react'

interface PinterestPreviewProps {
  title: string
  description: string
  mediaUrl: string | null
  mediaType: 'image' | 'video' | null
  trackedUrl: string
}

function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function PinterestPreview({ title, description, mediaUrl, mediaType, trackedUrl }: PinterestPreviewProps) {
  if (!title.trim() && !description.trim() && !mediaUrl) {
    return <p className="text-body-sm text-text-muted">Nothing to preview yet.</p>
  }

  const domain = trackedUrl ? domainOf(trackedUrl) : null

  return (
    <div className="w-64 overflow-hidden rounded-2xl border border-black/10 bg-white text-black">
      {mediaUrl ? (
        mediaType === 'video' ? (
          <video src={mediaUrl} className="w-full object-cover" muted controls />
        ) : (
          <img src={mediaUrl} alt="" className="w-full object-cover" />
        )
      ) : (
        <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 bg-gray-100 text-gray-400">
          <AlertTriangle size={20} />
          <p className="px-4 text-center text-caption">Pinterest requires an image</p>
        </div>
      )}

      <div className="p-2.5">
        <div className="mb-1 flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-black">{title || 'Untitled pin'}</p>
          <button
            type="button"
            className="shrink-0 rounded-full bg-[#E60023] px-3.5 py-1.5 text-xs font-bold text-white"
          >
            Save
          </button>
        </div>
        {description.trim() && (
          <p className="mb-1.5 line-clamp-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-700">
            {description}
          </p>
        )}
        <div className="flex items-center justify-between text-gray-500">
          {domain ? <p className="truncate text-xs">{domain}</p> : <span />}
          <div className="flex shrink-0 items-center gap-2">
            <Share size={14} />
            <MoreHorizontal size={14} />
          </div>
        </div>
      </div>
    </div>
  )
}
