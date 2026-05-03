import { useCallback } from 'react'
import { useDndStore } from '../stores/dndStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useFolderStore } from '../stores/folderStore'
import { computePlacement, getUnifiedSiblings, normalizeOverId, type UnifiedSortableItem } from '../lib/dndUtils'
import type { Folder } from '../types'
import type { ListItem } from '../components/MainLayout'
import type { DragStartEvent, DragMoveEvent, DragEndEvent } from '@dnd-kit/core'

interface DragHandlersParams {
  items: ListItem[]
  renderedItems: UnifiedSortableItem[]
  multiDragRef: React.MutableRefObject<string[]>
  livePointerRef: React.MutableRefObject<{ x: number; y: number }>
  selectedId: string | null
}

export function useDragHandlers({
  items,
  renderedItems,
  multiDragRef,
  livePointerRef,
  selectedId,
}: DragHandlersParams) {
  const { setActive, setOver, clearDrag } = useDndStore()

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const rawId = String(event.active.id)
    const ev = event.activatorEvent as PointerEvent | MouseEvent
    livePointerRef.current = { x: ev.clientX, y: ev.clientY }

    const id = rawId.startsWith('bookmark:')
      ? rawId.slice('bookmark:'.length)
      : rawId.startsWith('sidebar:')
        ? rawId.slice('sidebar:'.length)
        : rawId
    const dragData = event.active.data.current

    if (dragData && 'node' in dragData) {
      const node = dragData.node as Folder
      setActive(id, {
        id: node.id,
        title: node.name,
        kind: 'folder',
        parentId: node.parent_id,
        version: node.version,
      }, 'sidebar')
      return
    }

    const { selectedIds, selectedFolderIds } = useBookmarkStore.getState()
    const item = items.find(i =>
      i.kind === 'folder' ? i.folder.id === id : i.bookmark.id === id
    )
    if (item) {
      const isSelected = item.kind === 'folder'
        ? selectedFolderIds.has(item.folder.id)
        : selectedIds.has(item.bookmark.id)
      if (isSelected) {
        const fIds = Array.from(selectedFolderIds)
        const bIds = Array.from(selectedIds).map(bid => `bookmark:${bid}`)
        const visualOrder = new Map(renderedItems.map((ri, idx) => [ri.id, idx]))
        multiDragRef.current = [...fIds, ...bIds].sort((a, b) => {
          const aIdx = visualOrder.get(a.startsWith('bookmark:') ? a.slice('bookmark:'.length) : a) ?? Number.MAX_SAFE_INTEGER
          const bIdx = visualOrder.get(b.startsWith('bookmark:') ? b.slice('bookmark:'.length) : b) ?? Number.MAX_SAFE_INTEGER
          return aIdx - bIdx
        })
      } else {
        multiDragRef.current = [rawId]
      }
      if (item.kind === 'folder') {
        setActive(id, {
          id: item.folder.id,
          title: item.folder.name,
          kind: 'folder',
          parentId: item.folder.parent_id,
          version: item.folder.version,
        }, 'main')
      } else {
        setActive(id, {
          id: item.bookmark.id,
          title: item.bookmark.title,
          kind: 'bookmark',
          parentId: item.bookmark.folder_id,
          version: item.bookmark.version,
        }, 'main')
      }
    }
  }, [items, renderedItems, setActive, multiDragRef, livePointerRef])

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const over = event.over
    if (!over) { setOver(null, null, null); return }

    const overId = String(over.id)
    const el = document.querySelector(`[data-drop-id="${overId}"]`)
    if (!el) { setOver(null, null, null); return }

    const rect = el.getBoundingClientRect()
    const position = (() => {
      const relY = livePointerRef.current.y - rect.top
      const h = rect.height
      if (relY < h * 0.3) return 'before' as const
      if (relY > h * 0.7) return 'after' as const
      return 'inside' as const
    })()

    const isFolderDropTarget =
      overId.startsWith('droppable:sidebar:') ||
      (overId.startsWith('droppable:') && items.some(i => i.kind === 'folder' && `droppable:${i.folder.id}` === overId))
    const finalPosition = (position === 'inside' && !isFolderDropTarget) ? 'after' : position

    if (finalPosition === 'inside') {
      setOver(overId, 'inside', null)
    } else if (finalPosition === 'before') {
      setOver(overId, 'before', { top: rect.top - 1.5, left: rect.left + 8, width: Math.max(rect.width - 16, 0) })
    } else {
      setOver(overId, 'after', { top: rect.bottom - 1.5, left: rect.left + 8, width: Math.max(rect.width - 16, 0) })
    }
  }, [items, setOver, livePointerRef])

  const handleDragEnd = useCallback(async (_event: DragEndEvent) => {
    const dndState = useDndStore.getState()
    const { activeId: dragId, activeItem: dragItem, overId, dropPosition } = dndState

    if (!dragId || !overId || !dropPosition || !dragItem) { clearDrag(); return }

    const itemDragId = dragId.startsWith('bookmark:') ? dragId.slice('bookmark:'.length) : dragId

    const draggedItem = items.find(i =>
      i.kind === 'folder' ? i.folder.id === itemDragId : i.bookmark.id === itemDragId
    ) ?? (() => {
      const sf = useFolderStore.getState().folderMap.get(itemDragId)
      if (sf) return { kind: 'folder' as const, folder: sf }
      const sb = useBookmarkStore.getState().bookmarks.find(b => b.id === itemDragId)
      if (sb) return { kind: 'bookmark' as const, bookmark: sb }
      return undefined
    })()
    if (!draggedItem) { clearDrag(); return }

    const isDraggedFolder = draggedItem.kind === 'folder'
    const targetId = normalizeOverId(overId)

    const targetItem: ListItem | undefined = items.find(i =>
      i.kind === 'folder' ? i.folder.id === targetId : i.bookmark.id === targetId
    ) ?? (useFolderStore.getState().folderMap.has(targetId)
      ? { kind: 'folder' as const, folder: useFolderStore.getState().folderMap.get(targetId)! }
      : (useBookmarkStore.getState().bookmarks.some(b => b.id === targetId)
        ? { kind: 'bookmark' as const, bookmark: useBookmarkStore.getState().bookmarks.find(b => b.id === targetId)! }
        : undefined))

    try {
      const folderStore = useFolderStore.getState()
      const bookmarkStore = useBookmarkStore.getState()
      const currentChildrenMap = folderStore.childrenMap
      const currentBookmarks = bookmarkStore.bookmarks
      const multiDragIds = multiDragRef.current.length > 1 ? [...multiDragRef.current] : null

      const fallbackItemsForParent = (pid: string | null): UnifiedSortableItem[] => [
        ...((currentChildrenMap.get(pid) ?? [])
          .map((id) => folderStore.folderMap.get(id))
          .filter((folder): folder is Folder => Boolean(folder))
          .map((folder) => ({ id: folder.id, parentId: folder.parent_id, sortKey: folder.sort_key }))),
        ...currentBookmarks
          .filter((bookmark) => bookmark.folder_id === pid)
          .map((bookmark) => ({ id: bookmark.id, parentId: bookmark.folder_id, sortKey: bookmark.sort_key })),
      ]

      const unifiedSiblingsOf = (pid: string | null) =>
        getUnifiedSiblings(renderedItems, fallbackItemsForParent(pid), pid, itemDragId)

      const unifiedSiblingsExcluding = (pid: string | null, excludeIds: Set<string>) =>
        getUnifiedSiblings(renderedItems, fallbackItemsForParent(pid), pid, '')
          .filter((siblingId) => !excludeIds.has(siblingId))

      const getSortKeyForId = (id: string) =>
        folderStore.folderMap.get(id)?.sort_key
        ?? currentBookmarks.find((bookmark) => bookmark.id === id)?.sort_key
        ?? ''

      const resolveDestinationParentId = () => {
        if (!targetItem) return selectedId
        if (targetItem.kind === 'folder') {
          return dropPosition === 'inside' ? targetItem.folder.id : targetItem.folder.parent_id
        }
        return targetItem.bookmark.folder_id
      }

      if (multiDragIds) {
        const destParentId = resolveDestinationParentId()
        const draggedIds = new Set(
          multiDragIds.map((selId) => (
            selId.startsWith('bookmark:') ? selId.slice('bookmark:'.length) : selId
          )),
        )
        const siblings = unifiedSiblingsExcluding(destParentId, draggedIds)

        let insertIdx = siblings.length
        if (targetItem && !(targetItem.kind === 'folder' && dropPosition === 'inside')) {
          const targetNodeId = targetItem.kind === 'folder' ? targetItem.folder.id : targetItem.bookmark.id
          const targetIdx = siblings.indexOf(targetNodeId)
          insertIdx = targetIdx === -1 ? siblings.length
            : dropPosition === 'before' ? targetIdx : targetIdx + 1
        }

        let { prevId, nextId } = computePlacement(siblings, insertIdx)
        if (prevId && nextId && getSortKeyForId(prevId) === getSortKeyForId(nextId)) {
          nextId = null
        }

        for (const selId of multiDragIds) {
          const strippedId = selId.startsWith('bookmark:') ? selId.slice('bookmark:'.length) : selId
          if (selId.startsWith('bookmark:')) {
            const bookmark = useBookmarkStore.getState().bookmarks.find((bk) => bk.id === strippedId)
            if (!bookmark) continue
            await useBookmarkStore.getState().move(strippedId, destParentId, prevId, nextId, bookmark.version)
          } else {
            const folder = useFolderStore.getState().folderMap.get(strippedId)
            if (!folder) continue
            await useFolderStore.getState().moveFolder(strippedId, destParentId, prevId, nextId, folder.version)
          }
          prevId = strippedId
        }
        useBookmarkStore.getState().clearSelection()
      } else if (isDraggedFolder) {
        const draggedFolder = draggedItem.folder
        let newParentId: string | null = null
        let prevId: string | null = null
        let nextId: string | null = null
        if (!targetItem) {
          newParentId = selectedId
          const siblings = unifiedSiblingsOf(selectedId)
          ;({ prevId, nextId } = computePlacement(siblings, siblings.length))
        } else if (targetItem.kind === 'folder' && dropPosition === 'inside') {
          newParentId = targetItem.folder.id
          const siblings = unifiedSiblingsOf(targetItem.folder.id)
          ;({ prevId, nextId } = computePlacement(siblings, siblings.length))
        } else if (targetItem.kind === 'bookmark') {
          newParentId = targetItem.bookmark.folder_id
          const siblings = unifiedSiblingsOf(newParentId)
          const targetIdx = siblings.indexOf(targetItem.bookmark.id)
          const insertIdx = targetIdx === -1 ? siblings.length
            : dropPosition === 'before' ? targetIdx : targetIdx + 1
          ;({ prevId, nextId } = computePlacement(siblings, insertIdx))
        } else {
          newParentId = targetItem.folder.parent_id
          const siblings = unifiedSiblingsOf(newParentId)
          const targetIdx = siblings.indexOf(targetItem.folder.id)
          const insertIdx = targetIdx === -1 ? siblings.length
            : dropPosition === 'before' ? targetIdx : targetIdx + 1
          ;({ prevId, nextId } = computePlacement(siblings, insertIdx))
        }
        await folderStore.moveFolder(itemDragId, newParentId, prevId, nextId, draggedFolder.version)
      } else {
        const draggedBookmark = currentBookmarks.find((b) => b.id === itemDragId) ?? draggedItem.bookmark
        let newFolderId: string | null = selectedId
        let prevId: string | null = null
        let nextId: string | null = null

        if (!targetItem) {
          const siblings = unifiedSiblingsOf(selectedId)
          ;({ prevId, nextId } = computePlacement(siblings, siblings.length))
        } else if (targetItem.kind === 'folder') {
          if (dropPosition === 'inside') {
            newFolderId = targetItem.folder.id
            const siblings = unifiedSiblingsOf(newFolderId)
            ;({ prevId, nextId } = computePlacement(siblings, siblings.length))
          } else {
            newFolderId = targetItem.folder.parent_id
            const nodeIds = unifiedSiblingsOf(newFolderId)
            const targetIdx = nodeIds.indexOf(targetItem.folder.id)
            const insertIdx = targetIdx === -1 ? nodeIds.length
              : dropPosition === 'before' ? targetIdx : targetIdx + 1
            ;({ prevId, nextId } = computePlacement(nodeIds, insertIdx))
            if (prevId && nextId) {
              const pk = folderStore.folderMap.get(prevId)?.sort_key ?? currentBookmarks.find(b => b.id === prevId)?.sort_key ?? ''
              const nk = folderStore.folderMap.get(nextId)?.sort_key ?? currentBookmarks.find(b => b.id === nextId)?.sort_key ?? ''
              if (pk === nk) nextId = null
            }
          }
        } else {
          newFolderId = targetItem.bookmark.folder_id
          const siblings = unifiedSiblingsOf(newFolderId)
          const targetIdx = siblings.indexOf(targetItem.bookmark.id)
          const insertIdx = dropPosition === 'before'
            ? (targetIdx === -1 ? siblings.length : targetIdx)
            : (targetIdx === -1 ? siblings.length : targetIdx + 1)
          ;({ prevId, nextId } = computePlacement(siblings, insertIdx))
        }
        await bookmarkStore.move(itemDragId, newFolderId, prevId, nextId, draggedBookmark.version)
      }
    } catch (e) {
      console.error('Move failed', e)
    }
    multiDragRef.current = []
    clearDrag()
  }, [items, renderedItems, clearDrag, selectedId, multiDragRef])

  const handleDragCancel = useCallback(() => {
    clearDrag()
  }, [clearDrag])

  return { handleDragStart, handleDragMove, handleDragEnd, handleDragCancel }
}
