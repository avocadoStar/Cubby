import { create } from 'zustand'
import type { Bookmark, BookmarkListResult } from '../types'
import * as api from '../services/api'

interface BookmarkStore {
  result: BookmarkListResult
  loading: boolean
  viewMode: 'grid' | 'list'
  lastParams: Record<string, string>
  fetchBookmarks: (params?: Record<string, string>) => Promise<void>
  createBookmark: (data: Partial<Bookmark>) => Promise<Bookmark>
  updateBookmark: (id: string, data: Partial<Bookmark>) => Promise<void>
  deleteBookmark: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  setViewMode: (mode: 'grid' | 'list') => void
  refresh: () => Promise<void>
}

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  result: { items: [], total: 0, page: 1, page_size: 50 },
  loading: false,
  viewMode: 'grid',
  lastParams: {},
  fetchBookmarks: async (params) => {
    set({ loading: true, lastParams: params || get().lastParams })
    try {
      const result = await api.getBookmarks(params || get().lastParams)
      set({ result: { ...result, items: Array.isArray(result?.items) ? result.items : [] }, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  createBookmark: async (data) => {
    const bookmark = await api.createBookmark(data)
    await get().refresh()
    return bookmark
  },
  updateBookmark: async (id, data) => {
    await api.updateBookmark(id, data)
    await get().refresh()
  },
  deleteBookmark: async (id) => {
    await api.deleteBookmark(id)
    await get().refresh()
  },
  toggleFavorite: async (id) => {
    await api.toggleFavorite(id)
    await get().refresh()
  },
  setViewMode: (mode) => set({ viewMode: mode }),
  refresh: () => get().fetchBookmarks(),
}))
