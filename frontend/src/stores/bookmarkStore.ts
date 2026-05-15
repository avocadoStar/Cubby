import { create } from 'zustand'
import type { BatchMoveItem, Bookmark } from '../types'
import { api } from '../services/api'
import { computeSortKeyFromNeighbors } from '../lib/sortKeys'
import { useFolderStore } from './folderStore'
import { useToastStore } from './toastStore'
import { useSelectionStore } from './selectionStore'
import { applyOptimisticBatchMoveBookmarkState, applyOptimisticBatchMoveFolderState, reconcileAfterBatchMove } from '../lib/optimisticUpdates'
import { showMoveError } from '../lib/errorHandler'
import { removeSetValue, sortBookmarksBySortKey, sortBookmarksBySortKeyThenId } from './bookmarkStoreHelpers'

let loadController: AbortController | null = null

interface BookmarkState {
  bookmarks: Bookmark[]
  loading: boolean
  deletingIds: Set<string>
  load: (folderId?: string | null) => Promise<void>
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

  load: async (folderId) => {
    loadController?.abort()
    loadController = new AbortController()
    const controller = loadController
    set({ bookmarks: [], loading: true })
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
    }))
    // Remove from selection if present
    const sel = useSelectionStore.getState()
    if (sel.selectedIds.has(id)) {
      sel.toggleSelect(id)
    }

    let undoClicked = false
    let done = false

    const finishUndo = () => {
      if (undoClicked) return
      undoClicked = true
      set((s) => {
        return { bookmarks: sortBookmarksBySortKey([...s.bookmarks, bookmark]), deletingIds: removeSetValue(s.deletingIds, id) }
      })
    }

    const finishDelete = () => {
      if (undoClicked || done) return
      done = true
      set((s) => ({
        bookmarks: s.bookmarks.filter((b) => b.id !== id),
        deletingIds: removeSetValue(s.deletingIds, id),
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
                return { bookmarks: sortBookmarksBySortKey([...s.bookmarks, restored]), deletingIds: removeSetValue(s.deletingIds, id) }
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

  updateNotes: async (id, notes) => {
    const previous = get().bookmarks.find((b) => b.id === id)?.notes
    set((state) => ({
      bookmarks: state.bookmarks.map((bookmark) => (
        bookmark.id === id ? { ...bookmark, notes } : bookmark
      )),
    }))
    try {
      await api.updateNotes(id, notes)
    } catch (e) {
      if (previous !== undefined) {
        set((state) => ({
          bookmarks: state.bookmarks.map((bookmark) => (
            bookmark.id === id ? { ...bookmark, notes: previous } : bookmark
          )),
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
