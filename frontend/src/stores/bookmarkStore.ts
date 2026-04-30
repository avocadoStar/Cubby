import { create } from 'zustand'
import type { Bookmark } from '../types'
import { api, ConflictError } from '../services/api'

interface BookmarkState {
  bookmarks: Bookmark[]
  selectedIds: Set<string>
  loading: boolean
  load: (folderId?: string | null) => Promise<void>
  toggleSelect: (id: string) => void
  clearSelection: () => void
  deleteSelected: () => Promise<void>
  deleteOne: (id: string) => Promise<void>
  move: (id: string, folderId: string | null, prevId: string | null, nextId: string | null, version: number) => Promise<void>
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  selectedIds: new Set(),
  loading: false,

  load: async (folderId) => {
    set({ loading: true })
    const bookmarks = await api.getBookmarks(folderId)
    set({ bookmarks, loading: false, selectedIds: new Set() })
  },

  toggleSelect: (id) => {
    set((state) => {
      const next = new Set(state.selectedIds)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return { selectedIds: next }
    })
  },

  clearSelection: () => set({ selectedIds: new Set() }),

  deleteSelected: async () => {
    const ids = Array.from(get().selectedIds)
    await api.batchDeleteBookmarks(ids)
    set({ selectedIds: new Set() })
    const { load } = get()
    await load((window as any).__currentFolderId)
  },

  deleteOne: async (id) => {
    await api.deleteBookmark(id)
  },

  move: async (id, folderId, prevId, nextId, version) => {
    try {
      await api.moveBookmark({ id, folder_id: folderId, prev_id: prevId, next_id: nextId, version })
    } catch (e) {
      if (e instanceof ConflictError) {
        await get().load(folderId)
      }
      throw e
    }
  },
}))
