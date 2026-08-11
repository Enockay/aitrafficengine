import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Heart,
  ImageIcon,
  Loader2,
  MessageCircle,
  MousePointerClick,
  Plus,
  Rocket,
  Share2,
  Sparkles,
  Trash2,
  Users,
  Wrench,
  X,
  XCircle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { LinkedInPreview } from '@/components/posts/LinkedInPreview'
import { PinterestPreview } from '@/components/posts/PinterestPreview'
import { RedditPreview } from '@/components/posts/RedditPreview'
import { TumblrPreview } from '@/components/posts/TumblrPreview'
import { TweetThreadPreview } from '@/components/posts/TweetThreadPreview'
import { useUsageQuery } from '@/hooks/useBilling'
import { useOptimalTimesQuery } from '@/hooks/useOptimalTimes'
import { usePlatformsQuery } from '@/hooks/usePlatforms'
import {
  useApprovePost,
  useDeletePost,
  useDeletePostMedia,
  usePostAnalyticsQuery,
  usePublishPost,
  useRepairPostLink,
  useSchedulePost,
  useUpdatePost,
  useUploadPostMedia,
  useVariantGroupQuery,
} from '@/hooks/usePosts'
import { useCancelSchedule, useRescheduleSchedule, useSchedulesQuery } from '@/hooks/useSchedules'
import { getErrorMessage } from '@/lib/errors'
import { nextOccurrence } from '@/lib/optimalTime'
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
  tumblr: 'Tumblr',
  pinterest: 'Pinterest',
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface PostEditorDialogProps {
  post: Post | null
  pageTitle?: string
  pageUrl?: string
  onOpenChange: (open: boolean) => void
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const combined = new Date(date)
  combined.setHours(hours || 0, minutes || 0, 0, 0)
  return combined
}

function toTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-text-muted">
      {icon}
      {children}
    </div>
  )
}

function MetricTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border-default bg-bg-primary px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-text-muted">
        {icon}
        <span className="text-caption">{label}</span>
      </div>
      <p className="mt-1 text-h3 text-text-primary">{value}</p>
    </div>
  )
}

export function PostEditorDialog({ post, pageTitle, pageUrl, onOpenChange }: PostEditorDialogProps) {
  const [tweets, setTweets] = useState<string[]>([''])
  const [bodyText, setBodyText] = useState('')
  // Shared by every platform that edits as title + body: Reddit, Tumblr, Pinterest.
  const [titleText, setTitleText] = useState('')
  const [hashtagsInput, setHashtagsInput] = useState('')
  const [trackedUrl, setTrackedUrl] = useState('')
  const [accountId, setAccountId] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState('09:00')
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  // Local status/publish-state override so approving/scheduling/publishing reflects
  // immediately without the caller having to re-supply a fresh `post` prop.
  const [livePost, setLivePost] = useState<Post | null>(post)

  const updatePost = useUpdatePost()
  const deletePost = useDeletePost()
  const approvePost = useApprovePost()
  const schedulePost = useSchedulePost()
  const publishPost = usePublishPost()
  const repairPostLink = useRepairPostLink()
  const uploadPostMedia = useUploadPostMedia()
  const deletePostMedia = useDeletePostMedia()
  const cancelSchedule = useCancelSchedule()
  const reschedulePost = useRescheduleSchedule()
  const { data: platforms } = usePlatformsQuery()
  const { data: usage } = useUsageQuery()
  const { data: optimalTimes } = useOptimalTimesQuery(post?.platform)
  const { data: variantGroup } = useVariantGroupQuery(post?.variant_group_id)
  const { data: schedulesData } = useSchedulesQuery('pending', !!post)
  const { data: analytics, isLoading: analyticsLoading } = usePostAnalyticsQuery(
    post?.id,
    livePost?.status === 'published'
  )

  const accounts = useMemo(
    () => platforms?.find((p) => p.platform === post?.platform)?.accounts ?? [],
    [platforms, post?.platform]
  )

  const mySchedule = useMemo(
    () => schedulesData?.items.find((s) => s.post_id === post?.id) ?? null,
    [schedulesData, post?.id]
  )

  const otherScheduledDates = useMemo(
    () =>
      (schedulesData?.items ?? [])
        .filter((s) => s.id !== mySchedule?.id)
        .map((s) => new Date(s.scheduled_at)),
    [schedulesData, mySchedule]
  )

  const isTwitter = post?.platform === 'twitter'
  const isReddit = post?.platform === 'reddit'
  const isLinkedIn = post?.platform === 'linkedin'
  const isTumblr = post?.platform === 'tumblr'
  const isPinterest = post?.platform === 'pinterest'
  const hasTitleField = isReddit || isTumblr || isPinterest

  useEffect(() => {
    if (post) {
      setLivePost(post)
      if (post.platform === 'twitter') {
        setTweets(splitTweets(post.body))
      } else {
        setBodyText(post.body ?? '')
      }
      setTitleText(['reddit', 'tumblr', 'pinterest'].includes(post.platform) ? (post.title ?? '') : '')
      setHashtagsInput((post.hashtags ?? []).join(', '))
      setTrackedUrl(post.tracked_url ?? '')
      setSelectedDate(null)
      setSelectedTime('09:00')
      setAccountId('')
      setMediaUrl(post.media_url ?? null)
      setMediaType(post.media_type ?? null)
    }
  }, [post])

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id)
    }
  }, [accounts, accountId])

  // Seed the reschedule picker from the post's live schedule once it loads.
  useEffect(() => {
    if (mySchedule && livePost?.status === 'scheduled') {
      const at = new Date(mySchedule.scheduled_at)
      setSelectedDate(at)
      setSelectedTime(toTimeValue(at))
      setAccountId(mySchedule.platform_account_id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySchedule?.id])

  if (!post || !livePost) {
    return <Dialog open={false} onOpenChange={onOpenChange} />
  }

  // The tracked link gets baked into post.body at generation time (see
  // routers/pages.py) using whatever BACKEND_URL the server had then. If that was a
  // dev/local address, the link is dead for anyone outside that machine — this is a
  // client-side heuristic just to show the fix affordance; the backend re-checks
  // authoritatively before actually rewriting anything.
  const hasLocalTrackedLink = /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/r\//.test(post.body ?? '')

  const maxScheduleDate =
    usage?.schedule_horizon_days != null
      ? new Date(Date.now() + usage.schedule_horizon_days * 24 * 60 * 60 * 1000)
      : undefined
  const scheduledAtDate = selectedDate ? combineDateAndTime(selectedDate, selectedTime) : null
  const isOverHorizon = !!(maxScheduleDate && scheduledAtDate && scheduledAtDate > maxScheduleDate)
  const isInPast = !!scheduledAtDate && scheduledAtDate <= new Date()

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
    } else if (hasTitleField) {
      body = bodyText
      title = titleText.trim().slice(0, 300) || null
    } else {
      body = bodyText
      title = bodyText.split('\n')[0]?.trim().slice(0, 300) || null
    }

    try {
      await updatePost.mutateAsync({
        id: post!.id,
        input: { title, body, hashtags: isReddit || isPinterest ? [] : hashtags, tracked_url: trackedUrl || null },
      })
      toast.success('Post saved')
      onOpenChange(false)
    } catch {
      toast.error('Failed to save post')
    }
  }

  async function handleApprove() {
    try {
      const updated = await approvePost.mutateAsync(post!.id)
      setLivePost(updated)
      toast.success('Post approved — pick a time to publish it below')
    } catch {
      toast.error('Failed to approve post')
    }
  }

  async function handleRepairLink() {
    try {
      const updated = await repairPostLink.mutateAsync(post!.id)
      if (updated.platform === 'twitter') {
        setTweets(splitTweets(updated.body))
      } else {
        setBodyText(updated.body ?? '')
      }
      toast.success('Tracked link fixed')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to fix link'))
    }
  }

  async function handleUploadMedia(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const updated = await uploadPostMedia.mutateAsync({ id: post!.id, file })
      setMediaUrl(updated.media_url ?? null)
      setMediaType(updated.media_type ?? null)
      toast.success('Media uploaded')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to upload media'))
    }
  }

  async function handleRemoveMedia() {
    try {
      await deletePostMedia.mutateAsync(post!.id)
      setMediaUrl(null)
      setMediaType(null)
      toast.success('Media removed')
    } catch {
      toast.error('Failed to remove media')
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
    if (!accountId || !scheduledAtDate) {
      toast.error('Pick an account, date, and time first')
      return
    }
    if (maxScheduleDate && scheduledAtDate > maxScheduleDate) {
      toast.error(`Your plan allows scheduling up to ${usage?.schedule_horizon_days} days ahead`)
      return
    }
    try {
      await schedulePost.mutateAsync({
        id: post!.id,
        platform_account_id: accountId,
        scheduled_at: scheduledAtDate.toISOString(),
      })
      toast.success('Post scheduled')
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to schedule post'))
    }
  }

  async function handleReschedule() {
    if (!mySchedule || !scheduledAtDate) {
      toast.error('Pick a date and time first')
      return
    }
    if (maxScheduleDate && scheduledAtDate > maxScheduleDate) {
      toast.error(`Your plan allows scheduling up to ${usage?.schedule_horizon_days} days ahead`)
      return
    }
    try {
      await reschedulePost.mutateAsync({
        id: mySchedule.id,
        scheduled_at: scheduledAtDate.toISOString(),
        platform_account_id: accountId || undefined,
      })
      toast.success('Post rescheduled')
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reschedule post'))
    }
  }

  async function handleCancelSchedule() {
    if (!mySchedule) return
    if (!confirm('Cancel this schedule? The post goes back to approved.')) return
    try {
      await cancelSchedule.mutateAsync(mySchedule.id)
      setLivePost((p) => (p ? { ...p, status: 'approved' } : p))
      toast.success('Schedule cancelled')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to cancel schedule'))
    }
  }

  async function handlePublish() {
    if (!accountId) {
      toast.error('Pick an account first')
      return
    }
    try {
      const updated = await publishPost.mutateAsync({ id: post!.id, platform_account_id: accountId })
      setLivePost(updated)
      toast.success('Post published')
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to publish post'))
    }
  }

  const overLimit = isTwitter
    ? tweets.some((t) => t.length > TWEET_CHAR_LIMIT)
    : isLinkedIn
      ? bodyText.length > LINKEDIN_CHAR_LIMIT
      : false

  const chartData = analytics?.daily.map((d) => ({ ...d, label: formatShortDate(d.date) })) ?? []

  return (
    <Dialog open={!!post} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-full max-w-4xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Edit post</DialogTitle>
            <Badge variant="info">{PLATFORM_LABEL[post.platform] ?? post.platform}</Badge>
            <Badge variant={STATUS_VARIANT[livePost.status] ?? 'neutral'}>{livePost.status}</Badge>
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
            {hasLocalTrackedLink && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-accent-yellow/40 bg-accent-yellow/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-accent-yellow" />
                  <p className="text-body-sm text-text-secondary">
                    This post's tracked link points at localhost — it was generated before{' '}
                    <code>BACKEND_URL</code> was set to a public URL and will be dead for anyone else.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRepairLink}
                  disabled={repairPostLink.isPending}
                  className="shrink-0"
                >
                  {repairPostLink.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Wrench size={14} />
                  )}
                  Fix link
                </Button>
              </div>
            )}

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

            {hasTitleField && (
              <div className="space-y-2">
                <Label htmlFor="post-title">Title</Label>
                <Input
                  id="post-title"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  maxLength={300}
                />
              </div>
            )}

            {!isTwitter && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="post-body">{isPinterest ? 'Description' : 'Body'}</Label>
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

            {!isReddit && !isPinterest && (
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

            <div className="space-y-2">
              <Label>Media</Label>
              {isPinterest && !mediaUrl && (
                <p className="flex items-center gap-1.5 text-caption text-accent-yellow">
                  <AlertTriangle size={12} /> Pinterest requires an image — this post can't be published without one.
                </p>
              )}
              {mediaUrl ? (
                <div className="flex items-center gap-3 rounded-md border border-border-default bg-bg-surface p-2.5">
                  {mediaType === 'video' ? (
                    <video src={mediaUrl} className="h-16 w-16 rounded object-cover" muted />
                  ) : (
                    <img src={mediaUrl} alt="" className="h-16 w-16 rounded object-cover" />
                  )}
                  <span className="flex-1 text-body-sm text-text-secondary">
                    {mediaType === 'video' ? 'Video attached' : 'Image attached'}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRemoveMedia}
                    disabled={deletePostMedia.isPending}
                  >
                    {deletePostMedia.isPending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border-default bg-bg-surface px-2.5 py-3 text-body-sm text-text-secondary hover:border-accent-red hover:text-accent-red">
                  {uploadPostMedia.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ImageIcon size={16} />
                  )}
                  {uploadPostMedia.isPending ? 'Uploading…' : 'Attach an image or video'}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleUploadMedia}
                    disabled={uploadPostMedia.isPending}
                  />
                </label>
              )}
            </div>

            {(livePost.status === 'approved' || livePost.status === 'failed') && (
              <div className="space-y-3 rounded-lg border border-border-default bg-bg-surface p-3.5">
                <div className="flex items-center justify-between">
                  <SectionLabel icon={<Rocket size={13} />}>Publish</SectionLabel>
                  {usage?.schedule_horizon_days != null && (
                    <span className="text-caption text-text-muted">
                      {usage.plan_name ? `${usage.plan_name} plan · ` : ''}
                      up to {usage.schedule_horizon_days} days ahead
                    </span>
                  )}
                </div>
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
                          {optimalTimes.slots.map((slot) => {
                            const occursAt = nextOccurrence(slot.weekday, slot.hour)
                            const locked = !!(maxScheduleDate && occursAt > maxScheduleDate)
                            return (
                              <button
                                key={`${slot.weekday}-${slot.hour}`}
                                type="button"
                                disabled={locked}
                                title={locked ? 'Beyond your plan’s scheduling horizon — upgrade to pick this' : undefined}
                                onClick={() => {
                                  setSelectedDate(occursAt)
                                  setSelectedTime(toTimeValue(occursAt))
                                }}
                                className={
                                  locked
                                    ? 'cursor-not-allowed rounded-full border border-border-default bg-bg-surface px-2.5 py-1 text-caption text-text-muted opacity-50'
                                    : 'rounded-full border border-border-default bg-bg-surface px-2.5 py-1 text-caption text-text-secondary hover:border-accent-red hover:text-accent-red'
                                }
                              >
                                {WEEKDAY_SHORT[slot.weekday]} {String(slot.hour).padStart(2, '0')}:00
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
                      <Calendar
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        minDate={new Date()}
                        maxDate={maxScheduleDate}
                        markedDates={otherScheduledDates}
                      />
                      <div className="flex flex-col gap-2">
                        <div className="space-y-1">
                          <Label className="text-caption text-text-muted">Time</Label>
                          <Input
                            type="time"
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                          />
                        </div>
                        {selectedDate && (
                          <p className="flex items-center gap-1.5 text-caption text-text-secondary">
                            <CalendarClock size={12} />
                            {formatDateTime(scheduledAtDate?.toISOString() ?? null)}
                          </p>
                        )}
                        {otherScheduledDates.length > 0 && (
                          <p className="flex items-center gap-1.5 text-caption text-text-muted">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-yellow" />
                            Dots mark days you already have another post scheduled
                          </p>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleSchedule}
                          disabled={schedulePost.isPending || !selectedDate || isOverHorizon || isInPast}
                        >
                          {schedulePost.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CalendarDays size={14} />
                          )}
                          Schedule
                        </Button>
                      </div>
                    </div>

                    {isOverHorizon && (
                      <div className="flex items-center justify-between gap-2 rounded-md border border-accent-yellow/40 bg-accent-yellow/10 px-2.5 py-2">
                        <p className="text-caption text-text-secondary">
                          That's beyond your {usage?.schedule_horizon_days}-day scheduling limit.
                        </p>
                        <Link
                          to="/billing"
                          className="shrink-0 text-caption font-medium text-accent-blue hover:underline"
                        >
                          Upgrade
                        </Link>
                      </div>
                    )}
                    {isInPast && !isOverHorizon && (
                      <p className="text-caption text-accent-red">Pick a time in the future.</p>
                    )}
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handlePublish}
                      disabled={publishPost.isPending}
                    >
                      {publishPost.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      Publish now
                    </Button>
                  </>
                )}
              </div>
            )}

            {livePost.status === 'scheduled' && (
              <div className="space-y-3 rounded-lg border border-border-default bg-bg-surface p-3.5">
                <div className="flex items-center justify-between">
                  <SectionLabel icon={<CalendarClock size={13} />}>Scheduled</SectionLabel>
                  {usage?.schedule_horizon_days != null && (
                    <span className="text-caption text-text-muted">
                      {usage.plan_name ? `${usage.plan_name} plan · ` : ''}
                      up to {usage.schedule_horizon_days} days ahead
                    </span>
                  )}
                </div>

                {mySchedule ? (
                  <>
                    <div className="flex items-center justify-between rounded-md border border-border-default bg-bg-primary px-3 py-2">
                      <div className="flex items-center gap-1.5 text-body-sm text-text-primary">
                        <Clock size={14} className="text-text-muted" />
                        Goes out {formatDateTime(mySchedule.scheduled_at)}
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelSchedule}
                        disabled={cancelSchedule.isPending}
                        className="flex items-center gap-1 text-caption text-text-muted hover:text-accent-red"
                      >
                        {cancelSchedule.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <XCircle size={12} />
                        )}
                        Cancel
                      </button>
                    </div>

                    <Label className="text-caption text-text-muted">Reschedule</Label>
                    {accounts.length > 0 && (
                      <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.account_handle
                              ? `@${account.account_handle}`
                              : (account.account_name ?? account.id)}
                          </option>
                        ))}
                      </Select>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
                      <Calendar
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        minDate={new Date()}
                        maxDate={maxScheduleDate}
                        markedDates={otherScheduledDates}
                      />
                      <div className="flex flex-col gap-2">
                        <div className="space-y-1">
                          <Label className="text-caption text-text-muted">Time</Label>
                          <Input
                            type="time"
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                          />
                        </div>
                        {selectedDate && (
                          <p className="flex items-center gap-1.5 text-caption text-text-secondary">
                            <CalendarClock size={12} />
                            {formatDateTime(scheduledAtDate?.toISOString() ?? null)}
                          </p>
                        )}
                        {otherScheduledDates.length > 0 && (
                          <p className="flex items-center gap-1.5 text-caption text-text-muted">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-yellow" />
                            Dots mark other posts already scheduled that day
                          </p>
                        )}
                        {isOverHorizon && (
                          <p className="text-caption text-accent-yellow">
                            Beyond your {usage?.schedule_horizon_days}-day scheduling limit.
                          </p>
                        )}
                        {isInPast && <p className="text-caption text-accent-red">Pick a time in the future.</p>}
                        <Button
                          size="sm"
                          onClick={handleReschedule}
                          disabled={reschedulePost.isPending || !selectedDate || isOverHorizon || isInPast}
                        >
                          {reschedulePost.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CalendarDays size={14} />
                          )}
                          Save new time
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-body-sm text-text-secondary">
                    Loading schedule details —{' '}
                    <Link to="/scheduler" className="text-accent-blue hover:underline">
                      or manage it from the Scheduler
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}

            {livePost.status === 'published' && (
              <div className="space-y-3 rounded-lg border border-border-default bg-bg-surface p-3.5">
                <div className="flex items-center justify-between">
                  <SectionLabel icon={<BarChart3 size={13} />}>Performance</SectionLabel>
                  {post.published_url && (
                    <a
                      href={post.published_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-caption font-medium text-accent-blue hover:underline"
                    >
                      View live <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-text-muted" />
                    {formatDateTime(post.published_at)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Rocket size={13} className="text-text-muted" />
                    {PLATFORM_LABEL[post.platform] ?? post.platform}
                  </span>
                </div>

                {analyticsLoading && (
                  <div className="flex justify-center py-6">
                    <Loader2 size={18} className="animate-spin text-text-muted" />
                  </div>
                )}

                {analytics && !analyticsLoading && (
                  <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <MetricTile icon={<Eye size={12} />} label="Impressions" value={analytics.impressions} />
                      <MetricTile
                        icon={<MousePointerClick size={12} />}
                        label="Clicks"
                        value={analytics.clicks}
                      />
                      <MetricTile icon={<Heart size={12} />} label="Likes" value={analytics.likes} />
                      <MetricTile
                        icon={<MessageCircle size={12} />}
                        label="Comments"
                        value={analytics.comments}
                      />
                      <MetricTile icon={<Share2 size={12} />} label="Shares" value={analytics.shares} />
                      <MetricTile icon={<Users size={12} />} label="Reach" value={analytics.reach} />
                    </div>

                    {chartData.length > 0 ? (
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="postClicksGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgb(var(--chart-1))" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="rgb(var(--chart-1))" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-default))" vertical={false} />
                            <XAxis
                              dataKey="label"
                              tick={{ fill: 'rgb(var(--text-muted))', fontSize: 10 }}
                              axisLine={{ stroke: 'rgb(var(--border-default))' }}
                              tickLine={false}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              tick={{ fill: 'rgb(var(--text-muted))', fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                              allowDecimals={false}
                              width={24}
                            />
                            <Tooltip
                              contentStyle={{
                                background: 'rgb(var(--bg-surface))',
                                border: '1px solid rgb(var(--border-default))',
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                              labelStyle={{ color: 'rgb(var(--text-primary))' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="clicks"
                              stroke="rgb(var(--chart-1))"
                              strokeWidth={2}
                              fill="url(#postClicksGradient)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="py-2 text-center text-caption text-text-muted">
                        No engagement data yet — check back once platform analytics sync in.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            {isTwitter && <TweetThreadPreview tweets={tweets} hashtags={hashtags} />}
            {isLinkedIn && <LinkedInPreview body={bodyText} hashtags={hashtags} />}
            {isReddit && <RedditPreview title={titleText} body={bodyText} />}
            {isTumblr && (
              <TumblrPreview
                title={titleText}
                body={bodyText}
                hashtags={hashtags}
                mediaUrl={mediaUrl}
                mediaType={mediaType}
              />
            )}
            {isPinterest && (
              <PinterestPreview
                title={titleText}
                description={bodyText}
                mediaUrl={mediaUrl}
                mediaType={mediaType}
                trackedUrl={trackedUrl}
              />
            )}
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
            {livePost.status === 'draft' && (
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
