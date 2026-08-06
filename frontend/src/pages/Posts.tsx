import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Search, Send } from 'lucide-react'

import { PageIntro } from '@/components/layout/PageIntro'
import { GeneratePostDialog } from '@/components/posts/GeneratePostDialog'
import { PostCard } from '@/components/posts/PostCard'
import { PostEditorDialog } from '@/components/posts/PostEditorDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePagesQuery } from '@/hooks/usePages'
import { useApprovePost, useDeletePost, usePostsQuery } from '@/hooks/usePosts'
import type { Post, PostStatus } from '@/types/post'

const STATUS_TABS: { label: string; value: PostStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Approved', value: 'approved' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Published', value: 'published' },
]

export default function Posts() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PostStatus | ''>('')
  const [generateOpen, setGenerateOpen] = useState(false)
  const [detailPost, setDetailPost] = useState<Post | null>(null)

  const { data: pagesData } = usePagesQuery({ limit: 100 })
  const pages = pagesData?.items ?? []
  const pageById = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages])

  const { data, isLoading, isError } = usePostsQuery({
    search: search || undefined,
    status: statusFilter || undefined,
  })
  const posts = data?.items ?? []

  const approvePost = useApprovePost()
  const deletePost = useDeletePost()

  async function handleApprove(post: Post) {
    try {
      await approvePost.mutateAsync(post.id)
      toast.success('Post approved')
    } catch {
      toast.error('Failed to approve post')
    }
  }

  async function handleDelete(post: Post) {
    if (!confirm('Delete this post?')) return
    try {
      await deletePost.mutateAsync(post.id)
      toast.success('Post deleted')
      if (detailPost?.id === post.id) setDetailPost(null)
    } catch {
      toast.error('Failed to delete post')
    }
  }

  const activePage = detailPost ? pageById.get(detailPost.page_id) : undefined

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h1 text-text-primary">Posts</h1>
        <Button onClick={() => setGenerateOpen(true)} disabled={pages.length === 0}>
          <Plus size={16} />
          Generate post
        </Button>
      </div>

      <PageIntro
        storageKey="posts"
        description="AI-drafted posts land here. Approve one, then publish now or schedule it — you'll need a connected platform account first."
        linkTo="/platforms"
        linkLabel="Connect a platform →"
      />

      {pages.length === 0 && !isLoading && (
        <p className="mb-4 text-body-sm text-text-secondary">
          Add and crawl a page first before generating posts.
        </p>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <Input
            placeholder="Search posts..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-5 flex items-center gap-1 overflow-x-auto border-b border-border-default">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`shrink-0 border-b-2 px-3 py-2 text-body-sm transition-colors ${
              statusFilter === tab.value
                ? 'border-accent-red text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      )}
      {isError && <p className="py-16 text-center text-body-sm text-accent-red">Failed to load posts.</p>}
      {!isLoading && !isError && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default py-16 text-center">
          <Send size={28} className="mb-3 text-text-muted" />
          <p className="text-body-sm text-text-secondary">No posts yet.</p>
          <p className="mt-1 text-caption text-text-muted">Generate one from a crawled page to get started.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            pageTitle={pageById.get(post.page_id)?.title ?? pageById.get(post.page_id)?.url}
            onView={() => setDetailPost(post)}
            onApprove={() => handleApprove(post)}
            onDelete={() => handleDelete(post)}
          />
        ))}
      </div>

      <GeneratePostDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        pages={pages}
        onGenerated={(post) => setDetailPost(post)}
      />
      <PostEditorDialog
        post={detailPost}
        pageTitle={activePage?.title ?? activePage?.url}
        pageUrl={activePage?.url}
        onOpenChange={(open) => !open && setDetailPost(null)}
      />
    </div>
  )
}
