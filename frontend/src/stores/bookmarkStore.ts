import { create } from 'zustand'
import type { BatchMoveItem, Bookmark } from '../types'
import { api, ConflictError } from '../services/api'
import { computeSortKeyFromNeighbors } from '../lib/sortKeys'
import { useFolderStore } from './folderStore'
import { useToastStore } from './toastStore'

let loadController: AbortController | null = null

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
  batchMove: (items: BatchMoveItem[]) => Promise<void>
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  selectedIds: new Set(),
  selectedFolderIds: new Set(),
  loading: false,
  deletingIds: new Set(),

  load: async (folderId) => {
    loadController?.abort()
    loadController = new AbortController()
    set({ loading: true })
    try {
      const bookmarks = await api.getBookmarks(folderId, loadController.signal)
      set({ bookmarks, loading: false, selectedIds: new Set(), selectedFolderIds: new Set() })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      set({ loading: false })
      throw e
    }
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
          if (undoClicked) return  // prevent double-click
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
            // Restore failed — undo the undo, allow finishDelete
            undoClicked = false
            finishDelete()
          })
        },
      })
    }).catch(() => {
      // API failed — re-add bookmark
      finishUndo()
    })
  },

  move: async (id, folderId, prevId, nextId, version, sortKey) => {
    const folderStore = useFolderStore.getState()
    const viewFolderId = folderStore.selectedId
    const snapshot = get().bookmarks
    const moving = snapshot.find((b) => b.id === id)
    const keyFor = (itemId: string | null) => {
      if (!itemId) return ''
      return folderStore.folderMap.get(itemId)?.sort_key
        ?? snapshot.find((b) => b.id === itemId)?.sort_key
        ?? ''
    }
    const optimisticSortKey = sortKey
      ?? computeSortKeyFromNeighbors(keyFor(prevId), keyFor(nextId))

    if (moving && optimisticSortKey) {
      const optimisticBookmark = {
        ...moving,
        folder_id: folderId,
        sort_key: optimisticSortKey,
        version,
      }
      set((state) => {
        const next = state.bookmarks
          .filter((b) => b.id !== id)
          .concat(folderId === viewFolderId ? [optimisticBookmark] : [])
          .sort((a, b) => a.sort_key < b.sort_key ? -1 : a.sort_key > b.sort_key ? 1 : a.id.localeCompare(b.id))
        const selectedIds = new Set(state.selectedIds)
        if (folderId !== viewFolderId) selectedIds.delete(id)
        return { bookmarks: next, selectedIds }
      })
    }

    try {
      const moved = await api.moveBookmark({
        id,
        folder_id: folderId,
        prev_id: prevId,
        next_id: nextId,
        sort_key: optimisticSortKey || null,
        version,
      })
      if (useFolderStore.getState().selectedId !== viewFolderId) return
      set((state) => {
        if (moved.folder_id !== viewFolderId) {
          return { bookmarks: state.bookmarks.filter((b) => b.id !== id) }
        }
        const exists = state.bookmarks.some((b) => b.id === id)
        const next = (exists
          ? state.bookmarks.map((b) => b.id === id ? { ...b, ...moved } : b)
          : [...state.bookmarks, moved]
        ).sort((a, b) => a.sort_key < b.sort_key ? -1 : a.sort_key > b.sort_key ? 1 : a.id.localeCompare(b.id))
        return { bookmarks: next }
      })
    } catch (e) {
      if (useFolderStore.getState().selectedId === viewFolderId) {
        set({ bookmarks: snapshot })
      }
      useToastStore.getState().show({
        message: e instanceof ConflictError
          ? '数据已变更，请刷新后重试'
          : '移动失败，请重试',
      })
      throw e
    }
  },

  batchMove: async (items) => {
    if (items.length === 0) return

    const folderStore = useFolderStore.getState()
    const viewFolderId = folderStore.selectedId
    const bookmarkSnapshot = {
      bookmarks: get().bookmarks,
      selectedIds: new Set(get().selectedIds),
      selectedFolderIds: new Set(get().selectedFolderIds),
    }
    const folderSnapshot = {
      folderMap: new Map(folderStore.folderMap),
      childrenMap: new Map(folderStore.childrenMap),
      expandedIds: new Set(folderStore.expandedIds),
      visibleNodes: folderStore.visibleNodes,
    }

    const bookmarkMoves = items.filter((item) => item.kind === 'bookmark')
    const folderMoves = items.filter((item) => item.kind === 'folder')
    const bookmarkMoveIds = new Set(bookmarkMoves.map((item) => item.id))
    const folderMoveIds = new Set(folderMoves.map((item) => item.id))

    set((state) => {
      const originalById = new Map(bookmarkSnapshot.bookmarks.map((bookmark) => [bookmark.id, bookmark]))
      const movedIntoView = bookmarkMoves
        .filter((item) => item.parent_id === viewFolderId)
        .map((item) => {
          const original = originalById.get(item.id)
          return original
            ? { ...original, folder_id: item.parent_id, sort_key: item.sort_key, version: item.version }
            : null
        })
        .filter((bookmark): bookmark is Bookmark => Boolean(bookmark))
      const selectedIds = new Set(state.selectedIds)
      const selectedFolderIds = new Set(state.selectedFolderIds)
      bookmarkMoveIds.forEach((id) => selectedIds.delete(id))
      folderMoveIds.forEach((id) => selectedFolderIds.delete(id))
      const bookmarks = state.bookmarks
        .filter((bookmark) => !bookmarkMoveIds.has(bookmark.id))
        .concat(movedIntoView)
        .sort((a, b) => a.sort_key < b.sort_key ? -1 : a.sort_key > b.sort_key ? 1 : a.id.localeCompare(b.id))
      return { bookmarks, selectedIds, selectedFolderIds }
    })

    if (folderMoves.length > 0) {
      useFolderStore.setState((state) => {
        const folderMap = new Map(state.folderMap)
        const childrenMap = new Map(state.childrenMap)

        for (const item of folderMoves) {
          const original = folderSnapshot.folderMap.get(item.id)
          if (!original) continue
          const oldParentId = original.parent_id
          folderMap.set(item.id, { ...original, parent_id: item.parent_id, sort_key: item.sort_key, version: item.version })

          if (childrenMap.has(oldParentId)) {
            childrenMap.set(oldParentId, (childrenMap.get(oldParentId) ?? []).filter((childId) => childId !== item.id))
          }
          if (childrenMap.has(item.parent_id)) {
            const siblings = (childrenMap.get(item.parent_id) ?? []).filter((childId) => childId !== item.id)
            let insertAt = siblings.length
            const previousBatchItemIndex = folderMoves.findIndex((candidate) => candidate.id === item.id) - 1
            const previousBatchItem = previousBatchItemIndex >= 0 ? folderMoves[previousBatchItemIndex] : null
            if (previousBatchItem && previousBatchItem.parent_id === item.parent_id && siblings.includes(previousBatchItem.id)) {
              insertAt = siblings.indexOf(previousBatchItem.id) + 1
            }
            const nextSiblings = [...siblings]
            nextSiblings.splice(insertAt, 0, item.id)
            childrenMap.set(item.parent_id, nextSiblings)
          }
        }

        const touchedParents = new Set<string | null>()
        for (const item of folderMoves) {
          touchedParents.add(folderSnapshot.folderMap.get(item.id)?.parent_id ?? null)
          touchedParents.add(item.parent_id)
        }
        touchedParents.forEach((parentId) => {
          if (childrenMap.has(parentId)) {
            childrenMap.set(parentId, [...(childrenMap.get(parentId) ?? [])].sort((a, b) => {
              const af = folderMap.get(a)
              const bf = folderMap.get(b)
              if (!af || !bf) return a.localeCompare(b)
              if (af.sort_key < bf.sort_key) return -1
              if (af.sort_key > bf.sort_key) return 1
              return af.id.localeCompare(bf.id)
            }))
          }
          if (parentId === null || !childrenMap.has(parentId)) return
          const parent = folderMap.get(parentId)
          if (parent) {
            folderMap.set(parentId, { ...parent, has_children: (childrenMap.get(parentId) ?? []).length > 0 })
          }
        })
        for (const item of folderMoves) {
          if (item.parent_id === null || childrenMap.has(item.parent_id)) continue
          const parent = folderMap.get(item.parent_id)
          if (parent) {
            folderMap.set(item.parent_id, { ...parent, has_children: true })
          }
        }

        return { folderMap, childrenMap }
      })
      useFolderStore.getState().rebuildVisible()
    }

    try {
      const result = await api.batchMove(items)
      if (useFolderStore.getState().selectedId === viewFolderId) {
        set((state) => {
          let bookmarks = state.bookmarks.filter((bookmark) => !bookmarkMoveIds.has(bookmark.id))
          const returnedInView = result.bookmarks.filter((bookmark) => bookmark.folder_id === viewFolderId)
          bookmarks = bookmarks
            .concat(returnedInView)
            .sort((a, b) => a.sort_key < b.sort_key ? -1 : a.sort_key > b.sort_key ? 1 : a.id.localeCompare(b.id))
          return { bookmarks }
        })
      }
      if (result.folders.length > 0) {
        useFolderStore.setState((state) => {
          const folderMap = new Map(state.folderMap)
          for (const folder of result.folders) {
            folderMap.set(folder.id, folder)
          }
          return { folderMap }
        })
        useFolderStore.getState().rebuildVisible()
      }
    } catch (e) {
      if (useFolderStore.getState().selectedId === viewFolderId) {
        set(bookmarkSnapshot)
      }
      useFolderStore.setState(folderSnapshot)
      useToastStore.getState().show({
        message: e instanceof ConflictError
          ? '数据已变更，请刷新后重试'
          : '移动失败，请重试',
      })
      throw e
    }
  },
}))
