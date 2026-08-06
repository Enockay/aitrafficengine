import { Heart, MessageCircle, Repeat2, Share, UserRound } from 'lucide-react'

interface TweetThreadPreviewProps {
  tweets: string[]
  hashtags: string[]
}

function renderTweetText(text: string) {
  const parts = text.split(/(https?:\/\/\S+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <span key={i} className="text-accent-blue">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export function TweetThreadPreview({ tweets, hashtags }: TweetThreadPreviewProps) {
  const visible = tweets.filter((t) => t.trim().length > 0)

  if (visible.length === 0) {
    return <p className="text-body-sm text-text-muted">Nothing to preview yet.</p>
  }

  return (
    <div className="space-y-0 rounded-lg border border-border-default bg-black/90 p-1">
      {visible.map((tweet, index) => (
        <div key={index} className="relative flex gap-3 px-3 py-3">
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-tertiary">
              <UserRound size={18} className="text-text-muted" />
            </div>
            {index < visible.length - 1 && <div className="mt-1 w-px flex-1 bg-white/15" />}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-1 text-body-sm">
              <span className="font-semibold text-white">Your Brand</span>
              <span className="text-white/50">@yourbrand</span>
              <span className="text-white/50">· now</span>
            </div>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-body-sm leading-relaxed text-white/90">
              {renderTweetText(tweet)}
            </p>
            {index === visible.length - 1 && hashtags.length > 0 && (
              <p className="mt-1 text-body-sm text-accent-blue">
                {hashtags.map((h) => `#${h}`).join(' ')}
              </p>
            )}
            <div className="mt-2 flex max-w-xs items-center justify-between text-white/40">
              <MessageCircle size={15} />
              <Repeat2 size={15} />
              <Heart size={15} />
              <Share size={15} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
