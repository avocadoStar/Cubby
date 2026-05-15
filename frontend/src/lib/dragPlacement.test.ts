import { describe, expect, it } from 'vitest'
import type { Bookmark, Folder } from '../types'
import {
  computeMultiDragDrop,
  computeSingleBookmarkDrop,
  computeSingleFolderDrop,
  type DragState,
  type DropContext,
} from './dragPlacement'

const folder = (overrides: Partial<Folder>): Folder => ({
  id: 'folder',
  name: 'Folder',
  parent_id: null,
  sort_key: 'n',
  version: 1,
  has_children: false,
  created_at: '',
  updated_at: '',
  ...overrides,
})

const bookmark = (overrides: Partial<Bookmark>): Bookmark => ({
  id: 'bookmark',
  title: 'Bookmark',
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

const dragState = (overrides: Partial<DragState>): DragState => ({
  activeId: 'f1',
  activeItem: { id: 'f1', kind: 'folder', parentId: null, version: 1 },
  overId: 'f2',
  dropPosition: 'after',
  ...overrides,
})

const context = (
  folders: Folder[],
  bookmarks: Bookmark[],
  overrides: Partial<DropContext> = {},
): DropContext => ({
  items: [
    ...folders.map((item) => ({ kind: 'folder' as const, folder: item })),
    ...bookmarks.map((item) => ({ kind: 'bookmark' as const, bookmark: item })),
  ],
  renderedItems: [
    ...folders.map((item) => ({ id: item.id, parentId: item.parent_id, sortKey: item.sort_key })),
    ...bookmarks.map((item) => ({ id: item.id, parentId: item.folder_id, sortKey: item.sort_key })),
  ],
  selectedId: null,
  folderMap: new Map(folders.map((item) => [item.id, item])),
  bookmarks,
  childrenMap: new Map([
    [null, folders.filter((item) => item.parent_id === null).map((item) => item.id)],
    ...folders.map((item) => [item.id, folders.filter((child) => child.parent_id === item.id).map((child) => child.id)] as const),
  ]),
  selectedIds: new Set(),
  selectedFolderIds: new Set(),
  ...overrides,
})

describe('dragPlacement', () => {
  it('computes a single folder drop inside another folder', () => {
    const source = folder({ id: 'source', sort_key: 'a' })
    const target = folder({ id: 'target', sort_key: 'b' })
    const ctx = context([source, target], [])

    const result = computeSingleFolderDrop(
      dragState({ activeId: 'source', overId: 'droppable:target', dropPosition: 'inside' }),
      ctx,
    )

    expect(result).toMatchObject({
      newParentId: 'target',
      prevId: null,
      nextId: null,
    })
    expect(result?.sortKey).toBeTruthy()
  })

  it('computes a single bookmark drop before a sibling bookmark', () => {
    const dragged = bookmark({ id: 'dragged', sort_key: 'z', version: 3 })
    const target = bookmark({ id: 'target', sort_key: 'm' })
    const ctx = context([], [target, dragged])

    const result = computeSingleBookmarkDrop(
      dragState({
        activeId: 'dragged',
        activeItem: { id: 'dragged', kind: 'bookmark', parentId: null, version: 3 },
        overId: 'target',
        dropPosition: 'before',
      }),
      ctx,
    )

    expect(result).toMatchObject({
      newFolderId: null,
      prevId: null,
      nextId: 'target',
    })
    expect(result?.sortKey).toBeTruthy()
  })

  it('drops into the selected folder when the target is missing', () => {
    const selected = folder({ id: 'selected', sort_key: 'a' })
    const dragged = bookmark({ id: 'dragged', folder_id: null, sort_key: 'z' })
    const existing = bookmark({ id: 'existing', folder_id: 'selected', sort_key: 'm' })
    const ctx = context([selected], [dragged, existing], {
      selectedId: 'selected',
      childrenMap: new Map([[null, ['selected']], ['selected', []]]),
    })

    const result = computeSingleBookmarkDrop(
      dragState({
        activeId: 'dragged',
        activeItem: { id: 'dragged', kind: 'bookmark', parentId: null, version: 1 },
        overId: 'missing',
      }),
      ctx,
    )

    expect(result).toMatchObject({
      newFolderId: 'selected',
      prevId: 'existing',
      nextId: null,
    })
  })

  it('clears nextId when duplicate neighbor sort keys would make placement ambiguous', () => {
    const before = folder({ id: 'a-before', sort_key: 'same' })
    const after = folder({ id: 'b-after', sort_key: 'same' })
    const dragged = bookmark({ id: 'dragged', sort_key: 'z' })
    const ctx = context([before, after], [dragged])

    const result = computeSingleBookmarkDrop(
      dragState({
        activeId: 'dragged',
        activeItem: { id: 'dragged', kind: 'bookmark', parentId: null, version: 1 },
        overId: 'b-after',
        dropPosition: 'before',
      }),
      ctx,
    )

    expect(result).toMatchObject({
      prevId: 'a-before',
      nextId: null,
    })
  })

  it('builds a multi-drag batch across folders and bookmarks', () => {
    const dest = folder({ id: 'dest', sort_key: 'a' })
    const movingFolder = folder({ id: 'moving-folder', sort_key: 'x', version: 2 })
    const movingBookmark = bookmark({ id: 'moving-bookmark', sort_key: 'y', version: 4 })
    const ctx = context([dest, movingFolder], [movingBookmark])

    const result = computeMultiDragDrop(
      ['moving-folder', 'bookmark:moving-bookmark'],
      dragState({ activeId: 'moving-folder', overId: 'dest', dropPosition: 'inside' }),
      ctx,
    )

    expect(result?.destParentId).toBe('dest')
    expect(result?.batchItems).toEqual([
      expect.objectContaining({ kind: 'folder', id: 'moving-folder', parent_id: 'dest', version: 2 }),
      expect.objectContaining({ kind: 'bookmark', id: 'moving-bookmark', parent_id: 'dest', version: 4 }),
    ])
    expect(result?.batchItems[1].prev_id).toBe('moving-folder')
  })
})
