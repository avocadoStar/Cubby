import { create } from 'zustand'
import type { Bookmark } from '../types'
import { api, ConflictError } from '../services/api'

interface BookmarkState {
  bookmarks: Bookmark[]
  selectedIds: Set<string>
  selectedFolderIds: Set<string>
  loading: boolean
  load: (folderId?: string | null) => Promise<void>
  toggleSelect: (id: string) => void
  toggleFolderSelect: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  deleteSelected: () => Promise<void>
  deleteOne: (id: string) => Promise<void>
  move: (id: string, folderId: string | null, prevId: string | null, nextId: string | null, version: number) => Promise<void>
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  selectedIds: new Set(),
  selectedFolderIds: new Set(),
  loading: false,

  load: async (folderId) => {
    set({ loading: true })
    const bookmarks = await api.getBookmarks(folderId)
    set({ bookmarks, loading: false, selectedIds: new Set(), selectedFolderIds: new Set() })
  },

  toggleSelect: (id) => {
    set((state) => {
      const next = new Set(state.selectedIds)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return { selectedIds: next }
    })
  },

  toggleFolderSelect: (id) => {
    set((state) => {
      const next = new Set(state.selectedFolderIds)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return { selectedFolderIds: next }
    })
  },

  selectAll: () => {
    set((state) => {
      const all = new Set(state.bookmarks.map((b) => b.id))
      return { selectedIds: all }
    })
  },

  clearSelection: () => set({ selectedIds: new Set(), selectedFolderIds: new Set() }),

  deleteSelected: async () => {
    const { selectedIds, selectedFolderIds, load } = get()
    const bookmarkIds = Array.from(selectedIds)
    const folderIds = Array.from(selectedFolderIds)

    if (bookmarkIds.length > 0) {
      await api.batchDeleteBookmarks(bookmarkIds)
    }
    if (folderIds.length > 0) {
      await api.batchDeleteFolders(folderIds)
    }

    set({ selectedIds: new Set(), selectedFolderIds: new Set() })
    await load((window as any).__currentFolderId)
    // Also reload folder tree
    const { useFolderStore } = await import('./folderStore')
    await useFolderStore.getState().loadChildren(null)
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
