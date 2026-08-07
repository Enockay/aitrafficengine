import { useEffect } from 'react'

const SITE_URL = 'https://aitrafficengine.com'
const DEFAULT_TITLE = 'AI Traffic Engine — Turn content into organic traffic'

interface SeoOptions {
  /** Full <title> text — callers own the whole string (brand-first for the homepage,
   * "Page name — AI Traffic Engine" for everything else) rather than having this hook
   * impose one fixed pattern that wouldn't fit both. */
  title: string
  description: string
  path: string
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

// Updates document.title plus the description/canonical/OG/Twitter meta tags for the
// current route. This is a client-side-only SPA (no server rendering), so this only
// helps Google's JS-rendering pass — raw link unfurlers (Slack, Twitter, iMessage,
// Discord) never run this code and always see index.html's static defaults instead.
// Restores those static defaults on unmount so navigating to a page that doesn't call
// useSeo (or back to one that no longer does) doesn't leave a stale title/description.
export function useSeo({ title, description, path }: SeoOptions) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`

    document.title = title
    upsertMeta('name', 'description', description)
    upsertCanonical(url)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)

    return () => {
      document.title = DEFAULT_TITLE
    }
  }, [title, description, path])
}
