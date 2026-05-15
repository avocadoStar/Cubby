import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBookmarkStore } from './bookmarkStore'
import { useSelectionStore } from './selectionStore'
import { api } from '../services/api'
import type { Bookmark } from '../types'

vi.mock('../services/api', () => ({
  api: {
    getBookmarks: vi.fn(),
    deleteBookmark: vi.fn(),
    restoreBookmark: vi.fn(),
    batchDeleteBookmarks: vi.fn(),
    batchDeleteFolders: vi.fn(),
    batchMove: vi.fn(),
    moveBookmark: vi.fn(),
    updateNotes: vi.fn(),
  },
  ConflictError: class extends Error {
    constructor(msg = 'conflict') { super(msg) }
  },
}))

vi.mock('./folderStore', () => ({
  useFolderStore: {
    getState: vi.fn(() => ({
      selectedId: null,
      loadChildren: vi.fn(),
      folderMap: new Map(),
      childrenMap: new Map(),
      expandedIds: new Set(),
      visibleNodes: [],
    })),
    setState: vi.fn(),
  },
}))

vi.mock('./toastStore', () => ({
  useToastStore: {
    getState: vi.fn(() => ({
      show: vi.fn(),
    })),
  },
}))

const makeBookmark = (overrides: Partial<Bookmark> = {}): Bookmark => ({
  id: 'b1',
  title: 'Test',
  url: 'https://example.com',
  icon: '',
  folder_id: null,
  sort_key: 'n',
  version: 1,
  notes: '',
  created_at: '',
  updated_at: '',
  ...overrides,
})

describe('bookmarkStore', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useBookmarkStore.setState({
      bookmarks: [],
      loading: false,
      deletingIds: new Set(),
      recentlyChangedIds: new Set(),
    })
    useSelectionStore.setState({
      selectedIds: new Set(),
      selectedFolderIds: new Set(),
    })
  })

  describe('load', () => {
    it('clears existing bookmarks and enters loading while a folder is loading', () => {
      const previous = [makeBookmark({ id: 'old' })]
      let resolveBookmarks!: (bookmarks: Bookmark[]) => void
      vi.mocked(api.getBookmarks).mockReturnValue(new Promise((resolve) => {
        resolveBookmarks = resolve
      }))
      useBookmarkStore.setState({ bookmarks: previous, loading: false })

      const loading = useBookmarkStore.getState().load('folder1')

      expect(useBookmarkStore.getState().bookmarks).toEqual([])
      expect(useBookmarkStore.getState().loading).toBe(true)

      resolveBookmarks([])
      return loading
    })

    it('loads bookmarks for a folder', async () => {
      const bookmarks = [makeBookmark({ id: 'b1' }), makeBookmark({ id: 'b2' })]
      vi.mocked(api.getBookmarks).mockResolvedValue(bookmarks)

      await useBookmarkStore.getState().load('folder1')

      expect(api.getBookmarks).toHaveBeenCalledWith('folder1', expect.any(AbortSignal))
      const state = useBookmarkStore.getState()
      expect(state.bookmarks).toEqual(bookmarks)
      expect(state.loading).toBe(false)
    })

    it('keeps existing bookmarks during refresh loads', async () => {
      const previous = [makeBookmark({ id: 'old' })]
      let resolveBookmarks!: (bookmarks: Bookmark[]) => void
      vi.mocked(api.getBookmarks).mockReturnValue(new Promise((resolve) => {
        resolveBookmarks = resolve
      }))
      useBookmarkStore.setState({ bookmarks: previous, loading: false })

      const loading = useBookmarkStore.getState().load('folder1', { mode: 'refresh' })

      expect(useBookmarkStore.getState().bookmarks).toEqual(previous)
      expect(useBookmarkStore.getState().loading).toBe(true)

      const latest = [makeBookmark({ id: 'latest' })]
      resolveBookmarks(latest)
      await loading

      expect(useBookmarkStore.getState().bookmarks).toEqual(latest)
      expect(useBookmarkStore.getState().loading).toBe(false)
    })

    it('clears selection on load', async () => {
      useSelectionStore.setState({ selectedIds: new Set(['b1']), selectedFolderIds: new Set(['f1']) })
      vi.mocked(api.getBookmarks).mockResolvedValue([])

      await useBookmarkStore.getState().load(null)

      const selState = useSelectionStore.getState()
      expect(selState.selectedIds.size).toBe(0)
      expect(selState.selectedFolderIds.size).toBe(0)
    })

    it('sets loading to false on error', async () => {
      vi.mocked(api.getBookmarks).mockRejectedValue(new Error('fail'))

      await expect(useBookmarkStore.getState().load(null)).rejects.toThrow('fail')
      expect(useBookmarkStore.getState().loading).toBe(false)
    })

    it('leaves loading state unchanged on AbortError', async () => {
      useBookmarkStore.setState({ bookmarks: [makeBookmark({ id: 'old' })], loading: true })
      vi.mocked(api.getBookmarks).mockRejectedValue(new DOMException('aborted', 'AbortError'))

      await useBookmarkStore.getState().load(null)
      expect(useBookmarkStore.getState().loading).toBe(true)
      expect(useBookmarkStore.getState().bookmarks).toEqual([])
    })

    it('does not let an aborted older request overwrite the latest load', async () => {
      const latest = [makeBookmark({ id: 'latest' })]
      let rejectFirst!: (error: unknown) => void
      vi.mocked(api.getBookmarks)
        .mockReturnValueOnce(new Promise((_, reject) => {
          rejectFirst = reject
        }))
        .mockResolvedValueOnce(latest)

      const firstLoad = useBookmarkStore.getState().load('folder1')
      const secondLoad = useBookmarkStore.getState().load('folder2')
      rejectFirst(new DOMException('aborted', 'AbortError'))

      await Promise.all([firstLoad, secondLoad])

      expect(useBookmarkStore.getState().bookmarks).toEqual(latest)
      expect(useBookmarkStore.getState().loading).toBe(false)
    })
  })

  describe('updateNotes', () => {
    it('persists notes and updates the local bookmark', async () => {
      useBookmarkStore.setState({
        bookmarks: [makeBookmark({ id: 'b1', notes: '' })],
      })
      vi.mocked(api.updateNotes).mockResolvedValue(undefined)

      await useBookmarkStore.getState().updateNotes('b1', 'mobile note')

      expect(api.updateNotes).toHaveBeenCalledWith('b1', 'mobile note')
      expect(useBookmarkStore.getState().bookmarks[0].notes).toBe('mobile note')
    })
  })

  describe('upsertOne', () => {
    it('inserts bookmarks in sort order and marks them as recently changed', () => {
      const first = makeBookmark({ id: 'b1', sort_key: 'n' })
      const inserted = makeBookmark({ id: 'b0', sort_key: 'a' })
      useBookmarkStore.setState({ bookmarks: [first] })

      useBookmarkStore.getState().upsertOne(inserted)

      const state = useBookmarkStore.getState()
      expect(state.bookmarks.map((bookmark) => bookmark.id)).toEqual(['b0', 'b1'])
      expect(state.recentlyChangedIds.has('b0')).toBe(true)
    })

    it('replaces an existing bookmark without duplicating it', () => {
      const original = makeBookmark({ id: 'b1', title: 'Old', sort_key: 'n' })
      const updated = makeBookmark({ id: 'b1', title: 'New', sort_key: 'n' })
      useBookmarkStore.setState({ bookmarks: [original] })

      useBookmarkStore.getState().upsertOne(updated)

      expect(useBookmarkStore.getState().bookmarks).toEqual([updated])
    })
  })
})

describe('selectionStore', () => {
  afterEach(() => {
    useSelectionStore.setState({
      selectedIds: new Set(),
      selectedFolderIds: new Set(),
    })
  })

  it('toggleSelect adds and removes ids', () => {
    const { toggleSelect } = useSelectionStore.getState()
    toggleSelect('b1')
    expect(useSelectionStore.getState().selectedIds.has('b1')).toBe(true)
    toggleSelect('b1')
    expect(useSelectionStore.getState().selectedIds.has('b1')).toBe(false)
  })

  it('toggleFolderSelect adds and removes folder ids', () => {
    const { toggleFolderSelect } = useSelectionStore.getState()
    toggleFolderSelect('f1')
    expect(useSelectionStore.getState().selectedFolderIds.has('f1')).toBe(true)
    toggleFolderSelect('f1')
    expect(useSelectionStore.getState().selectedFolderIds.has('f1')).toBe(false)
  })

  it('selectAll selects all bookmarks and provided folder ids', () => {
    const bookmarks = [makeBookmark({ id: 'b1' }), makeBookmark({ id: 'b2' })]

    useSelectionStore.getState().selectAll(bookmarks, ['f1', 'f2'])

    const state = useSelectionStore.getState()
    expect(state.selectedIds).toEqual(new Set(['b1', 'b2']))
    expect(state.selectedFolderIds).toEqual(new Set(['f1', 'f2']))
  })

  it('clearSelection resets both sets', () => {
    useSelectionStore.setState({
      selectedIds: new Set(['b1']),
      selectedFolderIds: new Set(['f1']),
    })

    useSelectionStore.getState().clearSelection()

    const state = useSelectionStore.getState()
    expect(state.selectedIds.size).toBe(0)
    expect(state.selectedFolderIds.size).toBe(0)
  })
})
