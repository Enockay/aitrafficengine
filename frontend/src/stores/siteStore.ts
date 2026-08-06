import { create } from 'zustand'

// Site list/detail data lives in TanStack Query (see hooks/useSites.ts) since it's server
// state with its own caching lifecycle; this store only tracks which site's detail drawer is open.
interface SiteState {
  selectedSiteId: string | null
  selectSite: (id: string | null) => void
}

export const useSiteStore = create<SiteState>((set) => ({
  selectedSiteId: null,
  selectSite: (id) => set({ selectedSiteId: id }),
}))
