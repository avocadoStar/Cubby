import { create } from 'zustand'
import type { Bookmark, BookmarkListResult, BookmarkMutation } from '../types'
import * as api from '../services/api'
import { getErrorMessage } from '../utils/errors'

interface BookmarkStore {
  result: BookmarkListResult
  loading: boolean
  error: string | null
  viewMode: 'grid' | 'list'
  lastParams: Record<string, string>
  fetchBookmarks: (params?: Record<string, string>) => Promise<void>
  createBookmark: (data: BookmarkMutation) => Promise<Bookmark>
  updateBookmark: (id: string, data: Partial<BookmarkMutation>) => Promise<void>
  deleteBookmark: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  setViewMode: (mode: 'grid' | 'list') => void
  refresh: () => Promise<void>
}

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  result: { items: [], total: 0, page: 1, page_size: 50 },
  loading: false,
  error: null,
  viewMode: 'grid',
  lastParams: {},
  fetchBookmarks: async (params) => {
    const nextParams = params ?? get().lastParams
    set({ loading: true, lastParams: nextParams, error: null })

    try {
      const result = await api.getBookmarks(nextParams)
      set({
        result: { ...result, items: Array.isArray(result?.items) ? result.items : [] },
        loading: false,
      })
    } catch (error: unknown) {
      set({ error: getErrorMessage(error, '加载书签失败'), loading: false })
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
