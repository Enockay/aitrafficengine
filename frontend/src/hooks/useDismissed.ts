import { useState } from 'react'

export function useDismissed(key: string) {
  const storageKey = `ate:dismissed:${key}`
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(storageKey) === '1')

  function dismiss() {
    localStorage.setItem(storageKey, '1')
    setDismissed(true)
  }

  return { dismissed, dismiss }
}
