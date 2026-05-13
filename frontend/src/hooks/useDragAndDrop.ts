import { useEffect, useRef, useCallback } from 'react'
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { POINTER_SENSOR_CONFIG, calcDropPosition, type UnifiedSortableItem } from '../lib/dndUtils'
import { useDndStore } from '../stores/dndStore'
import { useFolderStore } from '../stores/folderStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useSelectionStore } from '../stores/selectionStore'
import type { Folder, Bookmark } from '../types'
import { computeSingleFolderDrop, computeSingleBookmarkDrop, computeMultiDragDrop, type DropContext, type DragState } from '../lib/dragPlacement'

type ListItem =
  | { kind: 'folder'; folder: Folder }
  | { kind: 'bookmark'; bookmark: Bookmark }

export function useDragAndDrop(
  items: ListItem[],
  renderedItems: UnifiedSortableItem[],
  selectedId: string | null,
) {
  const { setActive, setOver, clearDrag, activeId } = useDndStore()
  const livePointerRef = useRef({ x: 0, y: 0 })
  const multiDragRef = useRef<string[]>([])

  const sensors = useSensors(useSensor(PointerSensor, POINTER_SENSOR_CONFIG))

  useEffect(() => {
    if (!activeId) return
    const handler = (e: PointerEvent) => {
      livePointerRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('pointermove', handler, true)
    return () => window.removeEventListener('pointermove', handler, true)
  }, [activeId])

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

    const { selectedIds, selectedFolderIds } = useSelectionStore.getState()
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
          const ai = visualOrder.get(a.startsWith('bookmark:') ? a.slice('bookmark:'.length) : a) ?? Number.MAX_SAFE_INTEGER
          const bi = visualOrder.get(b.startsWith('bookmark:') ? b.slice('bookmark:'.length) : b) ?? Number.MAX_SAFE_INTEGER
          return ai - bi
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
  }, [items, renderedItems, setActive])

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const over = event.over
    if (!over) { setOver(null, null, null); return }
    const overId = String(over.id)
    const el = document.querySelector(`[data-drop-id="${overId}"]`)
    if (!el) { setOver(null, null, null); return }
    const rect = el.getBoundingClientRect()
    const position = calcDropPosition(rect, livePointerRef.current.y)

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
  }, [items, setOver])

  const handleDragEnd = useCallback((_event: DragEndEvent) => {
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

    const folderStore = useFolderStore.getState()
    const bookmarkStore = useBookmarkStore.getState()
    const { selectedIds, selectedFolderIds } = useSelectionStore.getState()
    const ctx: DropContext = {
      items,
      renderedItems,
      selectedId,
      folderMap: folderStore.folderMap,
      bookmarks: bookmarkStore.bookmarks,
      childrenMap: folderStore.childrenMap,
      selectedIds,
      selectedFolderIds,
    }
    const dragState: DragState = {
      activeId: itemDragId,
      activeItem: dragItem,
      overId,
      dropPosition,
    }

    const persistTasks: Promise<void>[] = []
    const multiDragIds = multiDragRef.current.length > 1 ? [...multiDragRef.current] : null

    if (multiDragIds) {
      const result = computeMultiDragDrop(multiDragIds, dragState, ctx)
      if (result && result.batchItems.length > 0) {
        persistTasks.push(useBookmarkStore.getState().batchMove(result.batchItems))
      }
      useSelectionStore.getState().clearSelection()
    } else if (draggedItem.kind === 'folder') {
      const result = computeSingleFolderDrop(dragState, ctx)
      if (result) {
        persistTasks.push(folderStore.moveFolder(itemDragId, result.newParentId, result.prevId, result.nextId, dragItem.version, result.sortKey || undefined))
      }
    } else {
      const result = computeSingleBookmarkDrop(dragState, ctx)
      if (result) {
        const draggedBookmark = bookmarkStore.bookmarks.find(b => b.id === itemDragId) ?? draggedItem.bookmark
        persistTasks.push(bookmarkStore.move(itemDragId, result.newFolderId, result.prevId, result.nextId, draggedBookmark.version, result.sortKey || undefined))
      }
    }

    multiDragRef.current = []
    clearDrag()
    if (persistTasks.length > 0) {
      Promise.allSettled(persistTasks).then((results) => {
        results.forEach((result) => {
          if (result.status === 'rejected') {
            console.error('Move failed', result.reason)
          }
        })
      })
    }
  }, [items, renderedItems, clearDrag, selectedId])

  const handleDragCancel = useCallback(() => { clearDrag() }, [clearDrag])

  return {
    sensors,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
    multiDragRef,
  }
}
