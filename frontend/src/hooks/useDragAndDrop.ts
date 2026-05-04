import { useEffect, useRef, useCallback } from 'react'
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { POINTER_SENSOR_CONFIG, calcDropPosition, computePlacement, getUnifiedSiblings, normalizeOverId, type UnifiedSortableItem } from '../lib/dndUtils'
import { ConflictError } from '../services/api'
import { useDndStore } from '../stores/dndStore'
import { useFolderStore } from '../stores/folderStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useToastStore } from '../stores/toastStore'
import type { Folder, Bookmark } from '../types'

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
          .filter((f): f is Folder => Boolean(f))
          .map((f) => ({ id: f.id, parentId: f.parent_id, sortKey: f.sort_key }))),
        ...currentBookmarks
          .filter((b) => b.folder_id === pid)
          .map((b) => ({ id: b.id, parentId: b.folder_id, sortKey: b.sort_key })),
      ]

      const siblingsOf = (pid: string | null) =>
        getUnifiedSiblings(renderedItems, fallbackItemsForParent(pid), pid, itemDragId)

      const siblingsExcluding = (pid: string | null, excludeIds: Set<string>) =>
        getUnifiedSiblings(renderedItems, fallbackItemsForParent(pid), pid, '')
          .filter((sid) => !excludeIds.has(sid))

      const getSortKey = (id: string) =>
        folderStore.folderMap.get(id)?.sort_key
        ?? currentBookmarks.find((b) => b.id === id)?.sort_key
        ?? ''

      const destParentId = () => {
        if (!targetItem) return selectedId
        if (targetItem.kind === 'folder') {
          return dropPosition === 'inside' ? targetItem.folder.id : targetItem.folder.parent_id
        }
        return targetItem.bookmark.folder_id
      }

      if (multiDragIds) {
        const dp = destParentId()
        const draggedIds = new Set(multiDragIds.map(sid => sid.startsWith('bookmark:') ? sid.slice('bookmark:'.length) : sid))
        const siblings = siblingsExcluding(dp, draggedIds)

        let insertIdx = siblings.length
        if (targetItem && !(targetItem.kind === 'folder' && dropPosition === 'inside')) {
          const tid = targetItem.kind === 'folder' ? targetItem.folder.id : targetItem.bookmark.id
          const ti = siblings.indexOf(tid)
          insertIdx = ti === -1 ? siblings.length : dropPosition === 'before' ? ti : ti + 1
        }

        let { prevId, nextId } = computePlacement(siblings, insertIdx)
        if (prevId && nextId && getSortKey(prevId) === getSortKey(nextId)) nextId = null

        for (const selId of multiDragIds) {
          const strippedId = selId.startsWith('bookmark:') ? selId.slice('bookmark:'.length) : selId
          if (selId.startsWith('bookmark:')) {
            const bookmark = useBookmarkStore.getState().bookmarks.find((bk) => bk.id === strippedId)
            if (bookmark) await useBookmarkStore.getState().move(strippedId, dp, prevId, nextId, bookmark.version)
          } else {
            const folder = useFolderStore.getState().folderMap.get(strippedId)
            if (folder) await useFolderStore.getState().moveFolder(strippedId, dp, prevId, nextId, folder.version)
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
          newParentId = selectedId; const s = siblingsOf(selectedId); ({ prevId, nextId } = computePlacement(s, s.length))
        } else if (targetItem.kind === 'folder' && dropPosition === 'inside') {
          newParentId = targetItem.folder.id; const s = siblingsOf(newParentId); ({ prevId, nextId } = computePlacement(s, s.length))
        } else if (targetItem.kind === 'bookmark') {
          newParentId = targetItem.bookmark.folder_id; const s = siblingsOf(newParentId)
          const ti = s.indexOf(targetItem.bookmark.id)
          const ii = ti === -1 ? s.length : dropPosition === 'before' ? ti : ti + 1
          ;({ prevId, nextId } = computePlacement(s, ii))
        } else {
          newParentId = targetItem.folder.parent_id; const s = siblingsOf(newParentId)
          const ti = s.indexOf(targetItem.folder.id)
          const ii = ti === -1 ? s.length : dropPosition === 'before' ? ti : ti + 1
          ;({ prevId, nextId } = computePlacement(s, ii))
        }
        await folderStore.moveFolder(itemDragId, newParentId, prevId, nextId, draggedFolder.version)
      } else {
        const draggedBookmark = currentBookmarks.find((b) => b.id === itemDragId) ?? draggedItem.bookmark
        let newFolderId: string | null = selectedId
        let prevId: string | null = null
        let nextId: string | null = null

        if (!targetItem) {
          const s = siblingsOf(selectedId); ({ prevId, nextId } = computePlacement(s, s.length))
        } else if (targetItem.kind === 'folder') {
          if (dropPosition === 'inside') {
            newFolderId = targetItem.folder.id; const s = siblingsOf(newFolderId); ({ prevId, nextId } = computePlacement(s, s.length))
          } else {
            newFolderId = targetItem.folder.parent_id; const s = siblingsOf(newFolderId)
            const ti = s.indexOf(targetItem.folder.id)
            const ii = ti === -1 ? s.length : dropPosition === 'before' ? ti : ti + 1
            ;({ prevId, nextId } = computePlacement(s, ii))
            if (prevId && nextId && getSortKey(prevId) === getSortKey(nextId)) nextId = null
          }
        } else {
          newFolderId = targetItem.bookmark.folder_id; const s = siblingsOf(newFolderId)
          const ti = s.indexOf(targetItem.bookmark.id)
          const ii = dropPosition === 'before' ? (ti === -1 ? s.length : ti) : (ti === -1 ? s.length : ti + 1)
          ;({ prevId, nextId } = computePlacement(s, ii))
        }
        await bookmarkStore.move(itemDragId, newFolderId, prevId, nextId, draggedBookmark.version)
      }
    } catch (e) {
      if (e instanceof ConflictError) {
        useToastStore.getState().show({ message: '数据已变更，请重试' })
      } else {
        console.error('Move failed', e)
        useToastStore.getState().show({ message: '移动失败，请重试' })
      }
    }
    multiDragRef.current = []
    clearDrag()
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
