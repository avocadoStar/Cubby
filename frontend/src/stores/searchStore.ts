import { create } from 'zustand'
import type { SearchResultItem } from '../types'
import { api } from '../services/api'

let searchController: AbortController | null = null

interface SearchState {
  query: string
  results: SearchResultItem[]
  loading: boolean
  search: (q: string) => Promise<void>
  clearSearch: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  loading: false,

  search: async (q) => {
    if (!q.trim()) {
      set({ query: '', results: [], loading: false })
      return
    }
    searchController?.abort()
    searchController = new AbortController()
    set({ query: q, loading: true })
    try {
      const results = await api.search(q, searchController.signal)
      set({ results, loading: false })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      set({ results: [], loading: false })
    }
  },

  clearSearch: () => set({ query: '', results: [], loading: false }),
}))
