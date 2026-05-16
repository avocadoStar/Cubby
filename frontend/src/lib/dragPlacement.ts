import type { Folder, Bookmark, BatchMoveItem } from '../types'
import type { UnifiedSortableItem } from './dndUtils'
import { computeSortKeyFromNeighbors } from './sortKeys'
import { computePlacement, getUnifiedSiblings } from './dndUtils'
import { normalizeOverId, stripDraggablePrefix, isBookmarkDragId } from './dndIds'

type ListItem =
  | { kind: 'folder'; folder: Folder }
  | { kind: 'bookmark'; bookmark: Bookmark }

export interface DragState {
  activeId: string
  activeItem: { id: string; kind: string; parentId: string | null; version: number }
  overId: string
  dropPosition: 'before' | 'after' | 'inside'
}

export interface DropContext {
  items: ListItem[]
  renderedItems: UnifiedSortableItem[]
  selectedId: string | null
  folderMap: Map<string, Folder>
  bookmarks: Bookmark[]
  childrenMap: Map<string | null, string[]>
  selectedIds: Set<string>
  selectedFolderIds: Set<string>
}

export interface SingleFolderDrop {
  newParentId: string | null
  prevId: string | null
  nextId: string | null
  sortKey: string
}

export function computeSingleFolderDrop(
  dragState: DragState,
  ctx: DropContext,
): SingleFolderDrop | null {
  const { activeId, overId, dropPosition } = dragState
  const draggedFolder = ctx.folderMap.get(activeId)
  if (!draggedFolder) return null

  const helpers = buildDropHelpers(ctx, activeId)
  const targetItem = helpers.findTarget(overId)

  let newParentId: string | null
  let prevId: string | null
  let nextId: string | null

  if (!targetItem) {
    newParentId = ctx.selectedId
    const s = helpers.siblingsOf(ctx.selectedId)
    ;({ prevId, nextId } = computePlacement(s, s.length))
  } else if (targetItem.kind === 'folder' && dropPosition === 'inside') {
    newParentId = targetItem.folder.id
    const s = helpers.siblingsOf(newParentId)
    ;({ prevId, nextId } = computePlacement(s, s.length))
  } else if (targetItem.kind === 'bookmark') {
    newParentId = targetItem.bookmark.folder_id
    const s = helpers.siblingsOf(newParentId)
    const ti = s.indexOf(targetItem.bookmark.id)
    const ii = ti === -1 ? s.length : dropPosition === 'before' ? ti : ti + 1
    ;({ prevId, nextId } = computePlacement(s, ii))
  } else {
    newParentId = targetItem.folder.parent_id
    const s = helpers.siblingsOf(newParentId)
    const ti = s.indexOf(targetItem.folder.id)
    const ii = ti === -1 ? s.length : dropPosition === 'before' ? ti : ti + 1
    ;({ prevId, nextId } = computePlacement(s, ii))
  }

  const sortKey = helpers.moveSortKey(prevId, nextId)
  return { newParentId, prevId, nextId, sortKey }
}

export interface SingleBookmarkDrop {
  newFolderId: string | null
  prevId: string | null
  nextId: string | null
  sortKey: string
}

export function computeSingleBookmarkDrop(
  dragState: DragState,
  ctx: DropContext,
): SingleBookmarkDrop | null {
  const { activeId, overId, dropPosition } = dragState
  const draggedBookmark = ctx.bookmarks.find(b => b.id === activeId)
  if (!draggedBookmark) return null

  const helpers = buildDropHelpers(ctx, activeId)
  const targetItem = helpers.findTarget(overId)

  let newFolderId: string | null = ctx.selectedId
  let prevId: string | null
  let nextId: string | null

  if (!targetItem) {
    const s = helpers.siblingsOf(ctx.selectedId)
    ;({ prevId, nextId } = computePlacement(s, s.length))
  } else if (targetItem.kind === 'folder') {
    if (dropPosition === 'inside') {
      newFolderId = targetItem.folder.id
      const s = helpers.siblingsOf(newFolderId)
      ;({ prevId, nextId } = computePlacement(s, s.length))
    } else {
      newFolderId = targetItem.folder.parent_id
      const s = helpers.siblingsOf(newFolderId)
      const ti = s.indexOf(targetItem.folder.id)
      const ii = ti === -1 ? s.length : dropPosition === 'before' ? ti : ti + 1
      ;({ prevId, nextId } = computePlacement(s, ii))
      if (prevId && nextId && helpers.getSortKey(prevId) === helpers.getSortKey(nextId)) nextId = null
    }
  } else {
    newFolderId = targetItem.bookmark.folder_id
    const s = helpers.siblingsOf(newFolderId)
    const ti = s.indexOf(targetItem.bookmark.id)
    const ii = dropPosition === 'before' ? (ti === -1 ? s.length : ti) : (ti === -1 ? s.length : ti + 1)
    ;({ prevId, nextId } = computePlacement(s, ii))
  }

  const sortKey = helpers.moveSortKey(prevId, nextId)
  return { newFolderId, prevId, nextId, sortKey }
}

export interface MultiDragDrop {
  destParentId: string | null
  batchItems: BatchMoveItem[]
}

export function computeMultiDragDrop(
  multiDragIds: string[],
  dragState: DragState,
  ctx: DropContext,
): MultiDragDrop | null {
  const { overId, dropPosition } = dragState

  const helpers = buildDropHelpers(ctx, '')
  const targetItem = helpers.findTarget(overId)

  const destParentId = (): string | null => {
    if (!targetItem) return ctx.selectedId
    if (targetItem.kind === 'folder') {
      return dropPosition === 'inside' ? targetItem.folder.id : targetItem.folder.parent_id
    }
    return targetItem.bookmark.folder_id
  }

  const dp = destParentId()
  const selectedFolderIds = new Set(multiDragIds.filter(sid => !isBookmarkDragId(sid)))
  const hasSelectedAncestor = (folderId: string) => {
    let current = ctx.folderMap.get(folderId)?.parent_id ?? null
    while (current) {
      if (selectedFolderIds.has(current)) return true
      current = ctx.folderMap.get(current)?.parent_id ?? null
    }
    return false
  }
  const effectiveDragIds = multiDragIds.filter(sid => {
    if (isBookmarkDragId(sid)) return true
    return !hasSelectedAncestor(sid)
  })
  const draggedIds = new Set(effectiveDragIds.map(sid => stripDraggablePrefix(sid)))

  const siblingsExcluding = (pid: string | null, excludeIds: Set<string>) =>
    helpers.siblingsOf(pid, '')
      .filter(sid => !excludeIds.has(sid))

  const siblings = siblingsExcluding(dp, draggedIds)

  let insertIdx = siblings.length
  if (targetItem && !(targetItem.kind === 'folder' && dropPosition === 'inside')) {
    const tid = targetItem.kind === 'folder' ? targetItem.folder.id : targetItem.bookmark.id
    const ti = siblings.indexOf(tid)
    insertIdx = ti === -1 ? siblings.length : dropPosition === 'before' ? ti : ti + 1
  }

  let { prevId, nextId } = computePlacement(siblings, insertIdx)
  if (prevId && nextId && helpers.getSortKey(prevId) === helpers.getSortKey(nextId)) nextId = null

  const batchItems: BatchMoveItem[] = []
  for (const selId of effectiveDragIds) {
    const strippedId = stripDraggablePrefix(selId)
    const sortKey = helpers.moveSortKey(prevId, nextId)
    if (isBookmarkDragId(selId)) {
      const bookmark = ctx.bookmarks.find(bk => bk.id === strippedId)
      if (bookmark) {
        batchItems.push({ kind: 'bookmark', id: strippedId, parent_id: dp, prev_id: prevId, next_id: nextId, optimistic_sort_key: sortKey, version: bookmark.version })
      }
    } else {
      const folder = ctx.folderMap.get(strippedId)
      if (folder) {
        batchItems.push({ kind: 'folder', id: strippedId, parent_id: dp, prev_id: prevId, next_id: nextId, optimistic_sort_key: sortKey, version: folder.version })
      }
    }
    if (sortKey) helpers.setSortKey(strippedId, sortKey)
    prevId = strippedId
  }

  return { destParentId: dp, batchItems }
}

function buildDropHelpers(ctx: DropContext, activeId: string) {
  const localSortKeys = new Map<string, string>()
  ctx.folderMap.forEach((f, id) => localSortKeys.set(id, f.sort_key))
  ctx.bookmarks.forEach(b => localSortKeys.set(b.id, b.sort_key))

  const fallbackItemsForParent = (pid: string | null): UnifiedSortableItem[] => [
    ...((ctx.childrenMap.get(pid) ?? [])
      .map(id => ctx.folderMap.get(id))
      .filter((f): f is Folder => Boolean(f))
      .map(f => ({ id: f.id, parentId: f.parent_id, sortKey: f.sort_key }))),
    ...ctx.bookmarks
      .filter(b => b.folder_id === pid)
      .map(b => ({ id: b.id, parentId: b.folder_id, sortKey: b.sort_key })),
  ]

  const getSortKey = (id: string | null) => id ? localSortKeys.get(id) ?? '' : ''

  return {
    getSortKey,
    setSortKey: (id: string, sortKey: string) => localSortKeys.set(id, sortKey),
    siblingsOf: (pid: string | null, excludeId = activeId) =>
      getUnifiedSiblings(ctx.renderedItems, fallbackItemsForParent(pid), pid, excludeId),
    moveSortKey: (prev: string | null, next: string | null) =>
      computeSortKeyFromNeighbors(getSortKey(prev), getSortKey(next)),
    findTarget: (overId: string) => findTargetItem(normalizeOverId(overId), ctx),
  }
}

function findTargetItem(targetId: string, ctx: DropContext): ListItem | undefined {
  return ctx.items.find(i =>
    i.kind === 'folder' ? i.folder.id === targetId : i.bookmark.id === targetId
  ) ?? (ctx.folderMap.has(targetId)
    ? { kind: 'folder' as const, folder: ctx.folderMap.get(targetId)! }
    : (ctx.bookmarks.some(b => b.id === targetId)
      ? { kind: 'bookmark' as const, bookmark: ctx.bookmarks.find(b => b.id === targetId)! }
      : undefined))
}
