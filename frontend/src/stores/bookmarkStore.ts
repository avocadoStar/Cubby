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
  selectAll: (folderIds?: string[]) => void
  clearSelection: () => void
  deleteSelected: () => Promise<void>
  deleteOne: (id: string) => Promise<void>
  move: (id: string, folderId: string | null, prevId: string | null, nextId: string | null, version: number, sortKey?: string) => Promise<void>
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

  selectAll: (folderIds) => {
    set((state) => {
      const all = new Set(state.bookmarks.map((b) => b.id))
      return { selectedIds: all, selectedFolderIds: new Set(folderIds ?? []) }
    })
  },

  clearSelection: () => set({ selectedIds: new Set(), selectedFolderIds: new Set() }),

  deleteSelected: async () => {
    const { selectedIds, selectedFolderIds } = get()
    const bookmarkIds = Array.from(selectedIds)
    const folderIds = Array.from(selectedFolderIds)

    if (bookmarkIds.length > 0) {
      await api.batchDeleteBookmarks(bookmarkIds)
    }
    if (folderIds.length > 0) {
      await api.batchDeleteFolders(folderIds)
    }

    set({ selectedIds: new Set(), selectedFolderIds: new Set() })
    const { useFolderStore } = await import('./folderStore')
    const folderStore = useFolderStore.getState()
    const currentFolderId = folderStore.selectedId
    await get().load(currentFolderId)
    await folderStore.loadChildren(currentFolderId)
    await folderStore.loadChildren(null)
  },

  deleteOne: async (id) => {
    await api.deleteBookmark(id)
  },

  move: async (id, folderId, prevId, nextId, version, sortKey) => {
    const doMove = async (ver: number) => {
      await api.moveBookmark({ id, folder_id: folderId, prev_id: prevId, next_id: nextId, sort_key: sortKey ?? null, version: ver })
      const { selectedId } = (await import('./folderStore')).useFolderStore.getState()
      await get().load(selectedId)
      console.warn('[BM-MOVE-OK] reloaded', selectedId)
    }

    try {
      await doMove(version)
    } catch (e) {
      if (e instanceof ConflictError) {
        const current = get().bookmarks.find(b => b.id === id)
        const sourceFolderId = current?.folder_id ?? null

        const { selectedId } = (await import('./folderStore')).useFolderStore.getState()
        const reloadOrder: Array<string | null> = []
        const pushFolder = (fid: string | null) => {
          const existingIdx = reloadOrder.findIndex((existing) => existing === fid)
          if (existingIdx >= 0) {
            reloadOrder.splice(existingIdx, 1)
          }
          reloadOrder.push(fid)
        }

        pushFolder(folderId)
        pushFolder(selectedId)
        pushFolder(sourceFolderId)

        for (const fid of reloadOrder) {
          await get().load(fid)
        }

        const fresh = get().bookmarks.find(b => b.id === id)
        if (fresh) {
          await doMove(fresh.version)
          return
        }
      }
      throw e
    }
  },
}))
