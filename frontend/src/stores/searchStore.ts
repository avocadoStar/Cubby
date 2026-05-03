import { create } from 'zustand'
import type { SearchResultItem } from '../types'
import { api } from '../services/api'

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
    set({ query: q, loading: true })
    const results = await api.search(q)
    set({ results, loading: false })
  },

  clearSearch: () => set({ query: '', results: [], loading: false }),
}))
