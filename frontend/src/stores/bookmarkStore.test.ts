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
    })
    useSelectionStore.setState({
      selectedIds: new Set(),
      selectedFolderIds: new Set(),
    })
  })

  describe('load', () => {
    it('loads bookmarks for a folder', async () => {
      const bookmarks = [makeBookmark({ id: 'b1' }), makeBookmark({ id: 'b2' })]
      vi.mocked(api.getBookmarks).mockResolvedValue(bookmarks)

      await useBookmarkStore.getState().load('folder1')

      expect(api.getBookmarks).toHaveBeenCalledWith('folder1', expect.any(AbortSignal))
      const state = useBookmarkStore.getState()
      expect(state.bookmarks).toEqual(bookmarks)
      expect(state.loading).toBe(false)
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
      useBookmarkStore.setState({ loading: true })
      vi.mocked(api.getBookmarks).mockRejectedValue(new DOMException('aborted', 'AbortError'))

      await useBookmarkStore.getState().load(null)
      expect(useBookmarkStore.getState().loading).toBe(true)
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
