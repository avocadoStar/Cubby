import type { BatchMoveItem, Bookmark, Folder } from '../types'

export interface BookmarkSnapshot {
  bookmarks: Bookmark[]
  selectedIds: Set<string>
  selectedFolderIds: Set<string>
}

export interface FolderSnapshot {
  folderMap: Map<string, Folder>
  childrenMap: Map<string | null, string[]>
  expandedIds: Set<string>
  visibleNodes: { node: Folder; depth: number }[]
}

export function applyOptimisticBatchMoveBookmarkState(
  state: { bookmarks: Bookmark[]; selectedIds: Set<string>; selectedFolderIds: Set<string> },
  items: BatchMoveItem[],
  viewFolderId: string | null,
): { bookmarks: Bookmark[]; selectedIds: Set<string>; selectedFolderIds: Set<string> } {
  const bookmarkMoves = items.filter((item) => item.kind === 'bookmark')
  const folderMoves = items.filter((item) => item.kind === 'folder')
  const bookmarkMoveIds = new Set(bookmarkMoves.map((item) => item.id))
  const folderMoveIds = new Set(folderMoves.map((item) => item.id))

  const originalById = new Map(state.bookmarks.map((b) => [b.id, b]))
  const movedIntoView = bookmarkMoves
    .filter((item) => item.parent_id === viewFolderId)
    .map((item) => {
      const original = originalById.get(item.id)
      return original
        ? { ...original, folder_id: item.parent_id, sort_key: item.optimistic_sort_key ?? original.sort_key, version: item.version }
        : null
    })
    .filter((b): b is Bookmark => Boolean(b))

  const selectedIds = new Set(state.selectedIds)
  const selectedFolderIds = new Set(state.selectedFolderIds)
  bookmarkMoveIds.forEach((id) => selectedIds.delete(id))
  folderMoveIds.forEach((id) => selectedFolderIds.delete(id))

  const bookmarks = state.bookmarks
    .filter((b) => !bookmarkMoveIds.has(b.id))
    .concat(movedIntoView)
    .sort((a, b) => a.sort_key < b.sort_key ? -1 : a.sort_key > b.sort_key ? 1 : a.id.localeCompare(b.id))

  return { bookmarks, selectedIds, selectedFolderIds }
}

export function applyOptimisticBatchMoveFolderState(
  state: { folderMap: Map<string, Folder>; childrenMap: Map<string | null, string[]> },
  items: BatchMoveItem[],
  folderSnapshot: Map<string, Folder>,
): { folderMap: Map<string, Folder>; childrenMap: Map<string | null, string[]> } {
  const folderMoves = items.filter((item) => item.kind === 'folder')
  const folderMap = new Map(state.folderMap)
  const childrenMap = new Map(state.childrenMap)

  for (const item of folderMoves) {
    const original = folderSnapshot.get(item.id)
    if (!original) continue
    const oldParentId = original.parent_id
    folderMap.set(item.id, { ...original, parent_id: item.parent_id, sort_key: item.optimistic_sort_key ?? original.sort_key, version: item.version })

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
    touchedParents.add(folderSnapshot.get(item.id)?.parent_id ?? null)
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
}

export function reconcileAfterBatchMove(
  state: { bookmarks: Bookmark[] },
  result: { bookmarks: Bookmark[] },
  bookmarkMoveIds: Set<string>,
  viewFolderId: string | null,
): { bookmarks: Bookmark[] } {
  let bookmarks = state.bookmarks.filter((b) => !bookmarkMoveIds.has(b.id))
  const returnedInView = result.bookmarks.filter((b) => b.folder_id === viewFolderId)
  bookmarks = bookmarks
    .concat(returnedInView)
    .sort((a, b) => a.sort_key < b.sort_key ? -1 : a.sort_key > b.sort_key ? 1 : a.id.localeCompare(b.id))
  return { bookmarks }
}
