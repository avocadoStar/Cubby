import { create } from 'zustand'
import type { BatchMoveItem, Bookmark } from '../types'
import { api } from '../services/api'
import { computeSortKeyFromNeighbors } from '../lib/sortKeys'
import { useFolderStore } from './folderStore'
import { useToastStore } from './toastStore'
import { useSelectionStore } from './selectionStore'
import { applyOptimisticBatchMoveBookmarkState, applyOptimisticBatchMoveFolderState, reconcileAfterBatchMove } from '../lib/optimisticUpdates'
import { showMoveError } from '../lib/errorHandler'
import {
  removeBookmarkById,
  removeSetValue,
  replaceBookmarkNotes,
  restoreBookmarkToList,
  sortBookmarksBySortKeyThenId,
  upsertChangedBookmark,
} from './bookmarkStoreHelpers'

let loadController: AbortController | null = null
export const DELETE_ANIMATION_MS = 220

interface BookmarkState {
  bookmarks: Bookmark[]
  loading: boolean
  deletingIds: Set<string>
  recentlyChangedIds: Set<string>
  load: (folderId?: string | null, options?: { mode?: 'replace' | 'refresh' }) => Promise<void>
  upsertOne: (bookmark: Bookmark) => void
  deleteSelected: () => Promise<void>
  deleteOne: (id: string) => void
  updateNotes: (id: string, notes: string) => Promise<void>
  move: (id: string, folderId: string | null, prevId: string | null, nextId: string | null, version: number, sortKey?: string) => Promise<void>
  batchMove: (items: BatchMoveItem[]) => Promise<void>
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  loading: false,
  deletingIds: new Set(),
  recentlyChangedIds: new Set(),

  load: async (folderId, options) => {
    loadController?.abort()
    loadController = new AbortController()
    const controller = loadController
    if (options?.mode === 'refresh') {
      set({ loading: true })
    } else {
      set({ bookmarks: [], loading: true })
    }
    try {
      const bookmarks = await api.getBookmarks(folderId, controller.signal)
      if (loadController !== controller) return
      set({ bookmarks, loading: false })
      useSelectionStore.getState().clearSelection()
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (loadController !== controller) return
      set({ loading: false })
      throw e
    }
  },

  upsertOne: (bookmark) => {
    set((state) => {
      const result = upsertChangedBookmark(state.bookmarks, bookmark)
      return {
        bookmarks: result.bookmarks,
        recentlyChangedIds: new Set([...state.recentlyChangedIds, ...result.changedIds]),
      }
    })
    globalThis.setTimeout(() => {
      set((state) => ({
        recentlyChangedIds: removeSetValue(state.recentlyChangedIds, bookmark.id),
      }))
    }, 900)
  },

  deleteSelected: async () => {
    const { selectedIds, selectedFolderIds } = useSelectionStore.getState()
    const bookmarkIds = Array.from(selectedIds)
    const folderIds = Array.from(selectedFolderIds)

    if (bookmarkIds.length > 0) {
      await api.batchDeleteBookmarks(bookmarkIds)
    }
    if (folderIds.length > 0) {
      await api.batchDeleteFolders(folderIds)
    }

    useSelectionStore.getState().clearSelection()
    const folderStore = useFolderStore.getState()
    const currentFolderId = folderStore.selectedId
    await get().load(currentFolderId, { mode: 'refresh' })
    await folderStore.loadChildren(currentFolderId)
    await folderStore.loadChildren(null)
  },

  deleteOne: (id) => {
    const bookmark = get().bookmarks.find((b) => b.id === id)
    if (!bookmark) return

    set((s) => ({
      deletingIds: new Set(s.deletingIds).add(id),
    }))

    const sel = useSelectionStore.getState()
    if (sel.selectedIds.has(id)) {
      sel.toggleSelect(id)
    }

    let undoClicked = false
    let done = false
    let apiSucceeded = false
    let animationDone = false
    let toastShown = false
    const deleteTimer = globalThis.setTimeout(() => {
      animationDone = true
      finishDelete()
      showDeleteToast()
    }, DELETE_ANIMATION_MS)

    const finishUndo = () => {
      globalThis.clearTimeout(deleteTimer)
      if (undoClicked) return
      undoClicked = true
      set((s) => {
        const bookmarks = s.bookmarks.some((b) => b.id === id)
          ? s.bookmarks
          : restoreBookmarkToList(s.bookmarks, bookmark)
        return { bookmarks, deletingIds: removeSetValue(s.deletingIds, id) }
      })
    }

    const finishDelete = () => {
      if (undoClicked || done) return
      done = true
      set((s) => ({
        bookmarks: removeBookmarkById(s.bookmarks, id),
        deletingIds: removeSetValue(s.deletingIds, id),
      }))
    }

    const showDeleteToast = () => {
      if (!apiSucceeded || !animationDone || undoClicked || toastShown) return
      toastShown = true
      useToastStore.getState().show({
        message: `已删除 "${bookmark.title}"`,
        onUndo: () => {
          if (undoClicked) return  // prevent double-click
          undoClicked = true
          globalThis.clearTimeout(deleteTimer)
          api.restoreBookmark(id).then((restored) => {
            if (restored) {
              set((s) => {
                return { bookmarks: restoreBookmarkToList(s.bookmarks, restored), deletingIds: removeSetValue(s.deletingIds, id) }
              })
            }
          }).catch(() => {
            undoClicked = false
            finishDelete()
          })
        },
      })
    }

    api.deleteBookmark(id).then(() => {
      if (undoClicked) return
      apiSucceeded = true
      showDeleteToast()
    }).catch(() => {
      finishUndo()
    })
  },

  updateNotes: async (id, notes) => {
    const previous = get().bookmarks.find((b) => b.id === id)?.notes
    set((state) => ({
      bookmarks: replaceBookmarkNotes(state.bookmarks, id, notes),
    }))
    try {
      await api.updateNotes(id, notes)
    } catch (e) {
      if (previous !== undefined) {
        set((state) => ({
          bookmarks: replaceBookmarkNotes(state.bookmarks, id, previous),
        }))
      }
      throw e
    }
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
        const sorted = sortBookmarksBySortKeyThenId(next)
        if (folderId !== viewFolderId) {
          const selectedIds = removeSetValue(useSelectionStore.getState().selectedIds, id)
          useSelectionStore.setState({ selectedIds })
        }
        return { bookmarks: sorted }
      })
    }

    try {
      const moved = await api.moveBookmark({
        id,
        folder_id: folderId,
        prev_id: prevId,
        next_id: nextId,
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
        )
        return { bookmarks: sortBookmarksBySortKeyThenId(next) }
      })
    } catch (e) {
      if (useFolderStore.getState().selectedId === viewFolderId) {
        set({ bookmarks: snapshot })
      }
      showMoveError(e)
      throw e
    }
  },

  batchMove: async (items) => {
    if (items.length === 0) return

    const folderStore = useFolderStore.getState()
    const viewFolderId = folderStore.selectedId
    const bookmarkSnapshot = {
      bookmarks: get().bookmarks,
      selectedIds: new Set(useSelectionStore.getState().selectedIds),
      selectedFolderIds: new Set(useSelectionStore.getState().selectedFolderIds),
    }
    const folderSnapshotMap = new Map(folderStore.folderMap)
    const folderSnapshot = {
      folderMap: folderSnapshotMap,
      childrenMap: new Map(folderStore.childrenMap),
      expandedIds: new Set(folderStore.expandedIds),
      visibleNodes: folderStore.visibleNodes,
    }

    // Optimistic bookmark update
    const bookmarkResult = applyOptimisticBatchMoveBookmarkState(bookmarkSnapshot, items, viewFolderId)
    set({ bookmarks: bookmarkResult.bookmarks })
    useSelectionStore.setState({ selectedIds: bookmarkResult.selectedIds, selectedFolderIds: bookmarkResult.selectedFolderIds })

    // Optimistic folder update
    const folderMoves = items.filter((item) => item.kind === 'folder')
    if (folderMoves.length > 0) {
      const folderResult = applyOptimisticBatchMoveFolderState(
        { folderMap: folderStore.folderMap, childrenMap: folderStore.childrenMap },
        items,
        folderSnapshotMap,
      )
      useFolderStore.setState({ folderMap: folderResult.folderMap, childrenMap: folderResult.childrenMap })
      useFolderStore.getState().rebuildVisible()
    }

    try {
      const result = await api.batchMove(items)
      if (useFolderStore.getState().selectedId === viewFolderId) {
        const bookmarkMoveIds = new Set(items.filter((item) => item.kind === 'bookmark').map((item) => item.id))
        const reconciled = reconcileAfterBatchMove(get(), result, bookmarkMoveIds, viewFolderId)
        set({ bookmarks: reconciled.bookmarks })
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
        set({ bookmarks: bookmarkSnapshot.bookmarks })
      }
      useSelectionStore.setState({ selectedIds: bookmarkSnapshot.selectedIds, selectedFolderIds: bookmarkSnapshot.selectedFolderIds })
      useFolderStore.setState({ folderMap: folderSnapshot.folderMap, childrenMap: folderSnapshot.childrenMap })
      showMoveError(e)
      throw e
    }
  },
}))
