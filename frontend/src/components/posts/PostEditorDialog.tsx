import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Plus, Rocket, Trash2, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { LinkedInPreview } from '@/components/posts/LinkedInPreview'
import { RedditPreview } from '@/components/posts/RedditPreview'
import { TweetThreadPreview } from '@/components/posts/TweetThreadPreview'
import { useOptimalTimesQuery } from '@/hooks/useOptimalTimes'
import { usePlatformsQuery } from '@/hooks/usePlatforms'
import {
  useApprovePost,
  useDeletePost,
  usePublishPost,
  useRepairPostLink,
  useSchedulePost,
  useUpdatePost,
  useVariantGroupQuery,
} from '@/hooks/usePosts'
import { nextOccurrence, toDatetimeLocalValue } from '@/lib/optimalTime'
import { joinTweets, splitTweets, type Post } from '@/types/post'

const TWEET_CHAR_LIMIT = 280
const LINKEDIN_CHAR_LIMIT = 3000

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
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface PostEditorDialogProps {
  post: Post | null
  pageTitle?: string
  pageUrl?: string
  onOpenChange: (open: boolean) => void
}

export function PostEditorDialog({ post, pageTitle, pageUrl, onOpenChange }: PostEditorDialogProps) {
  const [tweets, setTweets] = useState<string[]>([''])
  const [bodyText, setBodyText] = useState('')
  const [redditTitle, setRedditTitle] = useState('')
  const [hashtagsInput, setHashtagsInput] = useState('')
  const [trackedUrl, setTrackedUrl] = useState('')
  const [accountId, setAccountId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  const updatePost = useUpdatePost()
  const deletePost = useDeletePost()
  const approvePost = useApprovePost()
  const schedulePost = useSchedulePost()
  const publishPost = usePublishPost()
  const { data: platforms } = usePlatformsQuery()
  const { data: optimalTimes } = useOptimalTimesQuery(post?.platform)
  const { data: variantGroup } = useVariantGroupQuery(post?.variant_group_id)

  const accounts = useMemo(
    () => platforms?.find((p) => p.platform === post?.platform)?.accounts ?? [],
    [platforms, post?.platform]
  )

  const isTwitter = post?.platform === 'twitter'
  const isReddit = post?.platform === 'reddit'
  const isLinkedIn = post?.platform === 'linkedin'

  useEffect(() => {
    if (post) {
      if (post.platform === 'twitter') {
        setTweets(splitTweets(post.body))
      } else {
        setBodyText(post.body ?? '')
      }
      setRedditTitle(post.platform === 'reddit' ? (post.title ?? '') : '')
      setHashtagsInput((post.hashtags ?? []).join(', '))
      setTrackedUrl(post.tracked_url ?? '')
      setScheduledAt('')
      setAccountId('')
    }
  }, [post])

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id)
    }
  }, [accounts, accountId])

  if (!post) {
    return <Dialog open={false} onOpenChange={onOpenChange} />
  }

  const hashtags = hashtagsInput
    .split(',')
    .map((h) => h.trim().replace(/^#/, ''))
    .filter(Boolean)

  function updateTweet(index: number, value: string) {
    setTweets((prev) => prev.map((t, i) => (i === index ? value : t)))
  }

  function removeTweet(index: number) {
    setTweets((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
  }

  function addTweet() {
    setTweets((prev) => [...prev, ''])
  }

  async function handleSave() {
    let body: string
    let title: string | null

    if (isTwitter) {
      body = joinTweets(tweets)
      title = tweets[0]?.trim().slice(0, 300) || null
    } else if (isReddit) {
      body = bodyText
      title = redditTitle.trim().slice(0, 300) || null
    } else {
      body = bodyText
      title = bodyText.split('\n')[0]?.trim().slice(0, 300) || null
    }

    try {
      await updatePost.mutateAsync({
        id: post!.id,
        input: { title, body, hashtags: isReddit ? [] : hashtags, tracked_url: trackedUrl || null },
      })
      toast.success('Post saved')
    } catch {
      toast.error('Failed to save post')
    }
  }

  async function handleApprove() {
    try {
      await approvePost.mutateAsync(post!.id)
      toast.success('Post approved')
    } catch {
      toast.error('Failed to approve post')
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this post?')) return
    try {
      await deletePost.mutateAsync(post!.id)
      toast.success('Post deleted')
      onOpenChange(false)
    } catch {
      toast.error('Failed to delete post')
    }
  }

  async function handleSchedule() {
    if (!accountId || !scheduledAt) {
      toast.error('Pick an account and a time first')
      return
    }
    try {
      await schedulePost.mutateAsync({
        id: post!.id,
        platform_account_id: accountId,
        scheduled_at: new Date(scheduledAt).toISOString(),
      })
      toast.success('Post scheduled')
    } catch (error) {
      const message = isAxiosError(error) ? error.response?.data?.detail : undefined
      toast.error(message ?? 'Failed to schedule post')
    }
  }

  async function handlePublish() {
    if (!accountId) {
      toast.error('Pick an account first')
      return
    }
    try {
      await publishPost.mutateAsync({ id: post!.id, platform_account_id: accountId })
      toast.success('Post published')
    } catch (error) {
      const message = isAxiosError(error) ? error.response?.data?.detail : undefined
      toast.error(message ?? 'Failed to publish post')
    }
  }

  const overLimit = isTwitter
    ? tweets.some((t) => t.length > TWEET_CHAR_LIMIT)
    : isLinkedIn
      ? bodyText.length > LINKEDIN_CHAR_LIMIT
      : false

  return (
    <Dialog open={!!post} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-full max-w-4xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Edit post</DialogTitle>
            <Badge variant="info">{PLATFORM_LABEL[post.platform] ?? post.platform}</Badge>
            <Badge variant={STATUS_VARIANT[post.status] ?? 'neutral'}>{post.status}</Badge>
          </div>
          {pageTitle && (
            <p className="flex items-center gap-1 text-body-sm text-text-secondary">
              from {pageTitle}
              {pageUrl && (
                <a href={pageUrl} target="_blank" rel="noreferrer" className="text-accent-blue hover:underline">
                  <ExternalLink size={12} />
                </a>
              )}
            </p>
          )}
        </DialogHeader>

        {post.variant_group_id && variantGroup && variantGroup.variants.length > 1 && (
          <div className="mb-4 rounded-md border border-border-default bg-bg-surface p-3">
            <p className="mb-2 text-caption uppercase text-text-muted">
              Variant {post.variant_label} of {variantGroup.variants.length}
            </p>
            <div className="space-y-1.5">
              {variantGroup.variants.map((v) => (
                <div
                  key={v.post.id}
                  className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-body-sm ${
                    v.post.id === post.id ? 'bg-bg-tertiary' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">Variant {v.post.variant_label}</span>
                    <Badge variant={STATUS_VARIANT[v.post.status] ?? 'neutral'}>{v.post.status}</Badge>
                  </div>
                  <span className="text-text-secondary">{v.total_clicks} clicks</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {isTwitter && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tweets ({tweets.length})</Label>
                  <button
                    type="button"
                    onClick={addTweet}
                    className="flex items-center gap-1 text-caption text-accent-blue hover:underline"
                  >
                    <Plus size={12} /> Add tweet
                  </button>
                </div>
                <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                  {tweets.map((tweet, index) => {
                    const count = tweet.length
                    const isOver = count > TWEET_CHAR_LIMIT
                    return (
                      <div key={index} className="rounded-md border border-border-default bg-bg-surface p-2.5">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-caption text-text-muted">Tweet {index + 1}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-caption ${isOver ? 'text-accent-red' : 'text-text-muted'}`}>
                              {count}/{TWEET_CHAR_LIMIT}
                            </span>
                            {tweets.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTweet(index)}
                                className="text-text-muted hover:text-accent-red"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <textarea
                          value={tweet}
                          onChange={(e) => updateTweet(index, e.target.value)}
                          rows={3}
                          className="w-full resize-none rounded-md border border-border-default bg-bg-primary px-2.5 py-2 text-body-sm text-text-primary focus-visible:outline-none focus-visible:border-border-focus"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {isReddit && (
              <div className="space-y-2">
                <Label htmlFor="reddit-title">Title</Label>
                <Input
                  id="reddit-title"
                  value={redditTitle}
                  onChange={(e) => setRedditTitle(e.target.value)}
                  maxLength={300}
                />
              </div>
            )}

            {!isTwitter && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="post-body">Body</Label>
                  {isLinkedIn && (
                    <span
                      className={`text-caption ${bodyText.length > LINKEDIN_CHAR_LIMIT ? 'text-accent-red' : 'text-text-muted'}`}
                    >
                      {bodyText.length}/{LINKEDIN_CHAR_LIMIT}
                    </span>
                  )}
                </div>
                <textarea
                  id="post-body"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={10}
                  className="w-full resize-none rounded-md border border-border-default bg-bg-surface px-2.5 py-2 text-body-sm text-text-primary focus-visible:outline-none focus-visible:border-border-focus"
                />
              </div>
            )}

            {!isReddit && (
              <div className="space-y-2">
                <Label htmlFor="post-hashtags">Hashtags (comma separated)</Label>
                <Input
                  id="post-hashtags"
                  value={hashtagsInput}
                  onChange={(e) => setHashtagsInput(e.target.value)}
                  placeholder="webdev, techtips"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="post-url">Tracked URL</Label>
              <Input
                id="post-url"
                type="url"
                value={trackedUrl}
                onChange={(e) => setTrackedUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            {(post.status === 'approved' || post.status === 'failed') && (
              <div className="space-y-3 rounded-md border border-border-default bg-bg-surface p-3">
                <Label>Publish</Label>
                {accounts.length === 0 ? (
                  <p className="text-body-sm text-text-secondary">
                    No connected {PLATFORM_LABEL[post.platform] ?? post.platform} account.{' '}
                    <Link to="/platforms" className="text-accent-blue hover:underline">
                      Connect one
                    </Link>
                    .
                  </p>
                ) : (
                  <>
                    <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.account_handle ? `@${account.account_handle}` : (account.account_name ?? account.id)}
                        </option>
                      ))}
                    </Select>
                    {optimalTimes && optimalTimes.slots.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-caption text-text-muted">
                          Suggested times
                          {optimalTimes.sample_size < 3 && ' (general best practice — not enough post history yet)'}
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {optimalTimes.slots.map((slot) => (
                            <button
                              key={`${slot.weekday}-${slot.hour}`}
                              type="button"
                              onClick={() =>
                                setScheduledAt(toDatetimeLocalValue(nextOccurrence(slot.weekday, slot.hour)))
                              }
                              className="rounded-full border border-border-default bg-bg-surface px-2.5 py-1 text-caption text-text-secondary hover:border-accent-red hover:text-accent-red"
                            >
                              {WEEKDAY_SHORT[slot.weekday]} {String(slot.hour).padStart(2, '0')}:00
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSchedule}
                        disabled={schedulePost.isPending || !scheduledAt}
                      >
                        {schedulePost.isPending ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Rocket size={14} />
                        )}
                        Schedule
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handlePublish}
                      disabled={publishPost.isPending}
                    >
                      {publishPost.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Rocket size={14} />
                      )}
                      Publish now
                    </Button>
                  </>
                )}
              </div>
            )}

            {post.status === 'scheduled' && (
              <p className="text-body-sm text-text-secondary">
                This post is scheduled. Manage or cancel it from the{' '}
                <Link to="/scheduler" className="text-accent-blue hover:underline">
                  Scheduler
                </Link>
                .
              </p>
            )}

            {post.status === 'published' && post.published_url && (
              <p className="text-body-sm text-text-secondary">
                Published —{' '}
                <a
                  href={post.published_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-blue hover:underline"
                >
                  view live
                </a>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            {isTwitter && <TweetThreadPreview tweets={tweets} hashtags={hashtags} />}
            {isLinkedIn && <LinkedInPreview body={bodyText} hashtags={hashtags} />}
            {isReddit && <RedditPreview title={redditTitle} body={bodyText} />}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border-default pt-4">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-body-sm text-text-muted hover:text-accent-red"
          >
            <Trash2 size={14} /> Delete
          </button>
          <div className="flex items-center gap-2">
            {post.status === 'draft' && (
              <Button variant="secondary" onClick={handleApprove} disabled={approvePost.isPending}>
                {approvePost.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                Approve
              </Button>
            )}
            <Button onClick={handleSave} disabled={updatePost.isPending || overLimit}>
              {updatePost.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
