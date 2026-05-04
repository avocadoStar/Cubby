import { create } from 'zustand'
import type { Bookmark } from '../types'
import { api, ConflictError } from '../services/api'
import { useFolderStore } from './folderStore'
import { useToastStore } from './toastStore'

interface BookmarkState {
  bookmarks: Bookmark[]
  selectedIds: Set<string>
  selectedFolderIds: Set<string>
  loading: boolean
  deletingIds: Set<string>
  load: (folderId?: string | null) => Promise<void>
  toggleSelect: (id: string) => void
  toggleFolderSelect: (id: string) => void
  selectAll: (folderIds?: string[]) => void
  clearSelection: () => void
  deleteSelected: () => Promise<void>
  deleteOne: (id: string) => void
  move: (id: string, folderId: string | null, prevId: string | null, nextId: string | null, version: number, sortKey?: string) => Promise<void>
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  selectedIds: new Set(),
  selectedFolderIds: new Set(),
  loading: false,
  deletingIds: new Set(),

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
    const folderStore = useFolderStore.getState()
    const currentFolderId = folderStore.selectedId
    await get().load(currentFolderId)
    await folderStore.loadChildren(currentFolderId)
    await folderStore.loadChildren(null)
  },

  deleteOne: (id) => {
    const bookmark = get().bookmarks.find((b) => b.id === id)
    if (!bookmark) return

    // Start fade-out animation
    set((s) => ({
      deletingIds: new Set(s.deletingIds).add(id),
      selectedIds: (() => { const n = new Set(s.selectedIds); n.delete(id); return n })(),
    }))

    let undoClicked = false
    let done = false

    const finishUndo = () => {
      if (undoClicked) return
      undoClicked = true
      set((s) => {
        const d = new Set(s.deletingIds)
        d.delete(id)
        const next = [...s.bookmarks, bookmark]
        next.sort((a, b) => a.sort_key < b.sort_key ? -1 : 1)
        return { bookmarks: next, deletingIds: d }
      })
    }

    const finishDelete = () => {
      if (undoClicked || done) return
      done = true
      set((s) => ({
        bookmarks: s.bookmarks.filter((b) => b.id !== id),
        deletingIds: (() => { const d = new Set(s.deletingIds); d.delete(id); return d })(),
      }))
    }

    // Call delete API immediately
    api.deleteBookmark(id).then(() => {
      if (undoClicked) return
      finishDelete()
      // Show undo toast (API succeeded)
      useToastStore.getState().show({
        message: `已删除 "${bookmark.title}"`,
        onUndo: () => {
          undoClicked = true
          // Restore via backend
          api.restoreBookmark(id).then((restored) => {
            if (restored) {
              set((s) => {
                const next = [...s.bookmarks, restored]
                next.sort((a, b) => a.sort_key < b.sort_key ? -1 : 1)
                const d = new Set(s.deletingIds)
                d.delete(id)
                return { bookmarks: next, deletingIds: d }
              })
            }
          }).catch(() => {
            finishUndo()
          })
        },
      })
    }).catch(() => {
      // API failed — re-add bookmark
      finishUndo()
    })
  },

  move: async (id, folderId, prevId, nextId, version, sortKey) => {
    const doMove = async (ver: number) => {
      await api.moveBookmark({ id, folder_id: folderId, prev_id: prevId, next_id: nextId, sort_key: sortKey ?? null, version: ver })
      const { selectedId } = useFolderStore.getState()
      await get().load(selectedId)
    }

    try {
      await doMove(version)
    } catch (e) {
      if (e instanceof ConflictError) {
        const current = get().bookmarks.find(b => b.id === id)
        const sourceFolderId = current?.folder_id ?? null

        const { selectedId } = useFolderStore.getState()
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
