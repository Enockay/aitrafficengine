import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import api from '@/lib/api'

const SESSION_STORAGE_KEY = 'ate_telemetry_session_id'

// Fires a lightweight beacon to the backend on every SPA route change so the admin
// "Traffic" view can show which pages a user actually visited and how long they stuck
// around. Session id persists in sessionStorage (not localStorage) so it naturally
// resets per-tab/per-visit rather than living forever on the device.
export function useTelemetry(enabled: boolean) {
  const location = useLocation()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (lastPath.current === location.pathname) return
    lastPath.current = location.pathname

    const sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY) || undefined

    api
      .post<{ session_id: string }>('/telemetry/pageview', { path: location.pathname, session_id: sessionId })
      .then(({ data }) => sessionStorage.setItem(SESSION_STORAGE_KEY, data.session_id))
      .catch(() => {
        // Best-effort — a failed telemetry beacon shouldn't surface to the user or
        // block navigation in any way.
      })
  }, [enabled, location.pathname])
}
