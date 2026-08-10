import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { API_BASE_URL } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'

interface RealtimeEvent {
  type: string
  payload: {
    action: string
    entity_type: string
    entity_id: string
    details: Record<string, unknown> | null
    timestamp: string
  }
}

const RECONNECT_DELAY_MS = 3000

// Real-time updates per blueprint §11.4 — a WebSocket connection relays activity-log
// events (content mutations, publications, connections) as they happen server-side, so
// dashboards refresh live instead of waiting on the next TanStack Query refetch.
export function useRealtimeEvents() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!accessToken) return

    let cancelled = false

    function connect() {
      if (cancelled) return
      const wsUrl = `${API_BASE_URL.replace(/^http/, 'ws')}/ws?token=${accessToken}`
      const socket = new WebSocket(wsUrl)
      socketRef.current = socket

      socket.onmessage = (event) => {
        let parsed: RealtimeEvent
        try {
          parsed = JSON.parse(event.data)
        } catch {
          return
        }
        handleEvent(parsed)
      }

      socket.onclose = () => {
        if (!cancelled) {
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }

      socket.onerror = () => {
        socket.close()
      }
    }

    function handleEvent(event: RealtimeEvent) {
      const { entity_type } = event.payload

      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] })

      switch (entity_type) {
        case 'site':
          queryClient.invalidateQueries({ queryKey: ['sites'] })
          break
        case 'page':
          queryClient.invalidateQueries({ queryKey: ['pages'] })
          break
        case 'post':
          queryClient.invalidateQueries({ queryKey: ['posts'] })
          queryClient.invalidateQueries({ queryKey: ['analytics'] })
          break
        case 'flyer':
          queryClient.invalidateQueries({ queryKey: ['flyers'] })
          break
        case 'schedule':
          queryClient.invalidateQueries({ queryKey: ['schedules'] })
          break
        case 'platform_account':
          queryClient.invalidateQueries({ queryKey: ['platforms'] })
          break
        case 'platform_credentials':
          queryClient.invalidateQueries({ queryKey: ['platform-credentials'] })
          queryClient.invalidateQueries({ queryKey: ['platforms'] })
          break
      }

      // Support chat rides its own event type rather than the activity-log-derived
      // entity_type above — fired directly by services/support.py, not activity_log.py.
      // Invalidating a query key that isn't mounted (e.g. admin keys on a tenant's
      // browser) is a harmless no-op, so one case safely covers both sides.
      if (event.type === 'support_message') {
        queryClient.invalidateQueries({ queryKey: ['support-thread'] })
        queryClient.invalidateQueries({ queryKey: ['admin-support-conversations'] })
        queryClient.invalidateQueries({ queryKey: ['admin-support-thread'] })
      }

      if (event.type === 'post.publish') {
        toast.success('Post published', { description: 'A scheduled post just went live.' })
      } else if (event.type === 'post.publish_failed') {
        const error = event.payload.details?.error
        toast.error('Post failed to publish', {
          description: typeof error === 'string' ? error : undefined,
        })
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      socketRef.current?.close()
    }
  }, [accessToken, queryClient])
}
