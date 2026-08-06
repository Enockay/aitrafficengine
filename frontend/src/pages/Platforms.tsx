import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { KeyRound, Loader2, Plus, Trash2, User } from 'lucide-react'

import { PageIntro } from '@/components/layout/PageIntro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useConnectPlatform, useDisconnectPlatform, usePlatformsQuery } from '@/hooks/usePlatforms'
import type { PlatformAccount } from '@/types/platform'

const PLATFORM_META: Record<
  string,
  { label: string; glyph: string; color: string; description: string; envVars: string }
> = {
  twitter: {
    label: 'X / Twitter',
    glyph: '𝕏',
    color: '#000000',
    description: 'Publish generated threads directly to X.',
    envVars: 'TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET',
  },
  linkedin: {
    label: 'LinkedIn',
    glyph: 'in',
    color: '#0A66C2',
    description: 'Share posts to your LinkedIn feed.',
    envVars: 'LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET',
  },
  reddit: {
    label: 'Reddit',
    glyph: 'r/',
    color: '#FF4500',
    description: 'Submit self-posts to your Reddit profile.',
    envVars: 'REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET',
  },
}

function platformMeta(platform: string) {
  return (
    PLATFORM_META[platform] ?? {
      label: platform,
      glyph: platform.slice(0, 1).toUpperCase(),
      color: '#6B7280',
      description: '',
      envVars: '',
    }
  )
}

export default function Platforms() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: platforms, isLoading, isError } = usePlatformsQuery()
  const connectPlatform = useConnectPlatform()
  const disconnectPlatform = useDisconnectPlatform()

  useEffect(() => {
    const connected = searchParams.get('connected')
    const statusParam = searchParams.get('status')
    if (connected && statusParam) {
      if (statusParam === 'success') {
        toast.success(`${platformMeta(connected).label} connected`)
      } else {
        toast.error(`Failed to connect ${platformMeta(connected).label}`, {
          description: searchParams.get('message') ?? undefined,
        })
      }
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleConnect(platform: string) {
    try {
      const { authorize_url } = await connectPlatform.mutateAsync(platform)
      window.location.href = authorize_url
    } catch (error) {
      const message = isAxiosError(error) ? error.response?.data?.detail : undefined
      toast.error(message ?? `${platformMeta(platform).label} isn't configured yet`)
    }
  }

  async function handleDisconnect(account: PlatformAccount) {
    if (!confirm(`Disconnect @${account.account_handle ?? account.account_name}?`)) return
    try {
      await disconnectPlatform.mutateAsync(account.id)
      toast.success('Account disconnected')
    } catch {
      toast.error('Failed to disconnect account')
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-h1 text-text-primary">Platforms</h1>
      </div>
      <p className="mb-4 text-body-sm text-text-secondary">
        Connect the accounts your posts will publish to. Each platform needs OAuth credentials configured on
        the server before you can connect an account.
      </p>

      <PageIntro
        storageKey="platforms"
        description="This is what lets approved posts actually go out. Without a connected account, posts can be drafted and approved but never published."
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      )}
      {isError && <p className="py-16 text-center text-body-sm text-accent-red">Failed to load platforms.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platforms?.map((platform) => {
          const meta = platformMeta(platform.platform)
          return (
            <div
              key={platform.platform}
              className="flex flex-col rounded-xl border border-border-default bg-bg-secondary p-5 transition-colors hover:border-text-muted/40"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-body font-semibold text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.glyph}
                  </div>
                  <div>
                    <p className="text-body font-medium text-text-primary">{meta.label}</p>
                    <p className="text-caption text-text-muted">{meta.description}</p>
                  </div>
                </div>
              </div>

              <Badge
                variant={platform.configured ? 'success' : 'warning'}
                className="mb-3 w-fit"
              >
                {platform.configured ? 'Available' : 'Setup required'}
              </Badge>

              {!platform.configured && (
                <div className="mb-3 flex items-start gap-1.5 rounded-md bg-bg-surface px-2.5 py-2">
                  <KeyRound size={12} className="mt-0.5 shrink-0 text-text-muted" />
                  {isAdmin ? (
                    <p className="font-mono text-caption leading-relaxed text-text-muted">{meta.envVars}</p>
                  ) : (
                    <p className="text-caption leading-relaxed text-text-muted">
                      Not set up yet — contact an admin to configure this platform.
                    </p>
                  )}
                </div>
              )}

              {platform.accounts.length > 0 && (
                <div className="mb-3 space-y-2">
                  {platform.accounts.map((account) => {
                    // Twitter's handle is a real, human-readable @handle distinct from the
                    // display name, worth showing. Reddit's handle *is* the display name
                    // (redundant). LinkedIn's "handle" is an opaque member id, not a handle
                    // at all — showing it as "@..." would just be confusing noise.
                    const showHandle = platform.platform === 'twitter' && account.account_handle
                    return (
                      <div
                        key={account.id}
                        className="flex items-center justify-between rounded-md border border-border-default bg-bg-surface px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {account.avatar_url ? (
                            <img
                              src={account.avatar_url}
                              alt=""
                              className="h-7 w-7 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-tertiary text-text-muted">
                              <User size={13} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-body-sm leading-tight text-text-primary">
                              {account.account_name ?? 'Connected account'}
                            </p>
                            {showHandle && (
                              <p className="truncate text-caption leading-tight text-text-muted">
                                @{account.account_handle}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          title="Disconnect"
                          onClick={() => handleDisconnect(account)}
                          className="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:text-accent-red"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <Button
                variant={platform.configured ? 'default' : 'secondary'}
                size="sm"
                className="mt-auto w-full"
                disabled={connectPlatform.isPending}
                onClick={() => handleConnect(platform.platform)}
              >
                {connectPlatform.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                Connect account
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
