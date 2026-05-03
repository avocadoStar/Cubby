import Sidebar from './Sidebar'
import Toolbar from './Toolbar'
import BookmarkRow from './BookmarkRow'
import ToastContainer from './Toast'
import { useSearchStore } from '../stores/searchStore'
import BatchActionBar from './BatchActionBar'
import ContextMenu from './ContextMenu'
import DropIndicator from './DropIndicator'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useFolderStore } from '../stores/folderStore'
import { useDndStore } from '../stores/dndStore'
import { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  getClientRect,
  useSensor,
  useSensors,
  type Modifier,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { POINTER_SENSOR_CONFIG, pointerClosestCenter, calcDropPosition, computePlacement, getUnifiedSiblings, normalizeOverId, type UnifiedSortableItem } from '../lib/dndUtils'
import type { Folder, Bookmark } from '../types'

export type ListItem =
  | { kind: 'folder'; folder: Folder }
  | { kind: 'bookmark'; bookmark: Bookmark }

import ItemDroppable from './ItemDroppable'
import DraggableFolderRow from './FolderRow'
import SearchResults from './SearchResults'
import NotesPanel from './NotesPanel'

export default function MainLayout() {
  const { bookmarks, load, selectAll, selectedIds, selectedFolderIds, toggleFolderSelect } = useBookmarkStore()
  const { selectedId, childrenMap, folderMap, select } = useFolderStore()
  const { setActive, setOver, clearDrag, activeItem, activeId } = useDndStore()
  const { query: searchQuery, results: searchResults } = useSearchStore()
  const isSearching = searchQuery !== ''
  const [notesBookmarkId, setNotesBookmarkId] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const livePointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const multiDragRef = useRef<string[]>([])  // IDs being dragged in multi-select

  useEffect(() => { load(null) }, [])
  useEffect(() => { load(selectedId) }, [selectedId])

  const subFolderIds = useMemo(() => {
    return (childrenMap.get(selectedId) || []).filter((id) => folderMap.has(id))
  }, [selectedId, childrenMap, folderMap])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        selectAll(subFolderIds)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectAll, subFolderIds])

  const items: ListItem[] = useMemo(() => {
    const result: ListItem[] = []
    for (const id of subFolderIds) {
      const f = folderMap.get(id)
      if (f) result.push({ kind: 'folder', folder: f })
    }
    for (const b of bookmarks) {
      result.push({ kind: 'bookmark', bookmark: b })
    }
    // Interleave folders and bookmarks by sort_key
    const getKey = (i: ListItem) => i.kind === 'folder' ? i.folder.sort_key : i.bookmark.sort_key
    result.sort((a, b) => (getKey(a) < getKey(b) ? -1 : 1))
    return result
  }, [subFolderIds, folderMap, bookmarks])

  const renderedItems: UnifiedSortableItem[] = useMemo(() => {
    return items.map((item) => (
      item.kind === 'folder'
        ? { id: item.folder.id, parentId: item.folder.parent_id, sortKey: item.folder.sort_key }
        : { id: item.bookmark.id, parentId: item.bookmark.folder_id, sortKey: item.bookmark.sort_key }
    ))
  }, [items])

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 46,
    overscan: 10,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_SENSOR_CONFIG),
  )

  useEffect(() => {
    if (!activeId) return
    const handler = (e: PointerEvent) => {
      livePointerRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('pointermove', handler, true)
    return () => window.removeEventListener('pointermove', handler, true)
  }, [activeId])

  // --- Drag handlers ---

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const rawId = String(event.active.id)
    const ev = event.activatorEvent as PointerEvent | MouseEvent
    livePointerRef.current = { x: ev.clientX, y: ev.clientY }

    // Normalize per-surface draggable IDs back to store-level entity IDs.
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

    // Find the item in our list
    const item = items.find(i =>
      i.kind === 'folder' ? i.folder.id === id : i.bookmark.id === id
    )
    if (item) {
      // Multi-select: if dragged item is selected, drag all selected items
      const isSelected = item.kind === 'folder'
        ? selectedFolderIds.has(item.folder.id)
        : selectedIds.has(item.bookmark.id)
      if (isSelected) {
        const fIds = Array.from(selectedFolderIds)
        const bIds = Array.from(selectedIds).map(bid => `bookmark:${bid}`)
        const visualOrder = new Map(renderedItems.map((renderedItem, index) => [renderedItem.id, index]))
        multiDragRef.current = [...fIds, ...bIds].sort((a, b) => {
          const aIndex = visualOrder.get(a.startsWith('bookmark:') ? a.slice('bookmark:'.length) : a) ?? Number.MAX_SAFE_INTEGER
          const bIndex = visualOrder.get(b.startsWith('bookmark:') ? b.slice('bookmark:'.length) : b) ?? Number.MAX_SAFE_INTEGER
          return aIndex - bIndex
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
  }, [items, renderedItems, setActive, selectedIds, selectedFolderIds])

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const over = event.over
    if (!over) {
      setOver(null, null, null)
      return
    }
    const overId = String(over.id)
    const el = document.querySelector(`[data-drop-id="${overId}"]`)
    if (!el) {
      setOver(null, null, null)
      return
    }
    const rect = el.getBoundingClientRect()
    const position = calcDropPosition(rect, livePointerRef.current.y)

    // For bookmarks as drop targets, never allow "inside"
    const isFolderDropTarget =
      overId.startsWith('droppable:sidebar:') ||
      (overId.startsWith('droppable:') && items.some(i => i.kind === 'folder' && `droppable:${i.folder.id}` === overId))
    const finalPosition = (position === 'inside' && !isFolderDropTarget) ? 'after' : position

    if (finalPosition === 'inside') {
      setOver(overId, 'inside', null)
    } else if (finalPosition === 'before') {
      setOver(overId, 'before', {
        top: rect.top - 1.5,
        left: rect.left + 8,
        width: Math.max(rect.width - 16, 0),
      })
    } else {
      setOver(overId, 'after', {
        top: rect.bottom - 1.5,
        left: rect.left + 8,
        width: Math.max(rect.width - 16, 0),
      })
    }
  }, [items, setOver])

  const handleDragEnd = useCallback(async (_event: DragEndEvent) => {
    const dndState = useDndStore.getState()
    const { activeId: dragId, activeItem: dragItem, overId, dropPosition } = dndState

    if (!dragId || !overId || !dropPosition || !dragItem) {
      clearDrag()
      return
    }

    // Strip bookmark: prefix to match items list
    const itemDragId = dragId.startsWith('bookmark:') ? dragId.slice('bookmark:'.length) : dragId

    // Determine what was dragged: try right-panel items first, then folderMap (sidebar)
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
          insertIdx = targetIdx === -1
            ? siblings.length
            : dropPosition === 'before'
              ? targetIdx
              : targetIdx + 1
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
        // Moving a folder
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
          // Folder relative to a bookmark — compute sort key for interleaved order
          newParentId = targetItem.bookmark.folder_id
          const siblings = unifiedSiblingsOf(newParentId)
          const targetIdx = siblings.indexOf(targetItem.bookmark.id)
          const insertIdx = targetIdx === -1
            ? siblings.length
            : dropPosition === 'before'
              ? targetIdx
              : targetIdx + 1
          ;({ prevId, nextId } = computePlacement(siblings, insertIdx))
        } else {
          // Folder relative to another item in the unified panel order
          newParentId = targetItem.folder.parent_id
          const siblings = unifiedSiblingsOf(newParentId)
          const targetIdx = siblings.indexOf(targetItem.folder.id)
          const insertIdx = targetIdx === -1
            ? siblings.length
            : dropPosition === 'before'
              ? targetIdx
              : targetIdx + 1
          ;({ prevId, nextId } = computePlacement(siblings, insertIdx))
        }

        await folderStore.moveFolder(itemDragId, newParentId, prevId, nextId, draggedFolder.version)
      } else {
        // Moving a bookmark
        const draggedBookmark = currentBookmarks.find((b) => b.id === itemDragId) ?? draggedItem.bookmark
        let newFolderId: string | null = selectedId
        let prevId: string | null = null
        let nextId: string | null = null

        if (!targetItem) {
          // Dropped in empty space → append to current folder's bookmarks
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
            const insertIdx = targetIdx === -1
              ? nodeIds.length
              : dropPosition === 'before'
                ? targetIdx
                : targetIdx + 1
            ;({ prevId, nextId } = computePlacement(nodeIds, insertIdx))
            // If prev and next have the same sortKey, between() fails — use after(prev) instead
            if (prevId && nextId) {
              const pk = folderStore.folderMap.get(prevId)?.sort_key ?? currentBookmarks.find(b => b.id === prevId)?.sort_key ?? ''
              const nk = folderStore.folderMap.get(nextId)?.sort_key ?? currentBookmarks.find(b => b.id === nextId)?.sort_key ?? ''
              if (pk === nk) nextId = null
            }
          }
        } else {
          // Bookmark relative to another bookmark: normal before/after ordering
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
  }, [items, renderedItems, clearDrag, selectedId])

  const handleDragCancel = useCallback(() => {
    clearDrag()
  }, [clearDrag])

  const dragOverlayTopLeftModifier: Modifier = ({ transform, overlayNodeRect }) => ({
    ...transform,
    x: transform.x + ((overlayNodeRect?.width ?? 0) / 2) - 10,
    y: transform.y + ((overlayNodeRect?.height ?? 0) / 2) - 10,
  })

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={pointerClosestCenter}
      measuring={{ droppable: { measure: getClientRect } }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-screen bg-white relative">
        <ContextMenu />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Toolbar />
          <BatchActionBar />
          {isSearching ? (
            <SearchResults query={searchQuery} results={searchResults} />
          ) : (
          <>
          <div className="flex-1" ref={scrollRef} style={{ overflow: 'auto' }}>
            <div style={{ height: rowVirtualizer.getTotalSize() + 8, position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((vi) => {
                const item = items[vi.index]
                const wrapperStyle: React.CSSProperties = {
                  position: 'absolute',
                  top: 8,
                  left: 0,
                  width: '100%',
                  height: vi.size,
                  transform: `translateY(${vi.start}px)`,
                }

                if (item.kind === 'folder') {
                  return (
                    <ItemDroppable
                      key={item.folder.id}
                      item={item}
                      activeId={activeId}
                      folderMap={folderMap}
                      style={wrapperStyle}
                    >
                      <DraggableFolderRow
                        folder={item.folder}
                        isFolderSelected={selectedFolderIds.has(item.folder.id)}
                        onToggleSelect={() => toggleFolderSelect(item.folder.id)}
                        onNavigate={() => select(item.folder.id)}
                        onDelete={() => useFolderStore.getState().deleteOne(item.folder.id)}
                      />
                    </ItemDroppable>
                  )
                }
                return (
                  <ItemDroppable
                    key={item.bookmark.id}
                    item={item}
                    activeId={activeId}
                    folderMap={folderMap}
                    style={wrapperStyle}
                  >
                    <BookmarkRow bookmark={item.bookmark} onOpenNotes={() => setNotesBookmarkId(item.bookmark.id)} />
                  </ItemDroppable>
                )
              })}
            </div>
          </div>
          </>
          )}
        </div>
        <NotesPanel bookmark={notesBookmarkId ? bookmarks.find(b => b.id === notesBookmarkId) ?? null : null} onClose={() => setNotesBookmarkId(null)} />
      </div>

      <DragOverlay dropAnimation={null} modifiers={[dragOverlayTopLeftModifier]}>
        {activeItem && (
          <div
            className="flex items-center rounded select-none bg-white"
            style={{
              height: 32,
              maxWidth: 200,
              paddingLeft: 8,
              paddingRight: 8,
              opacity: 0.85,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transform: 'scale(1.02)',
            }}
          >
            {activeItem.kind === 'bookmark' ? (
              <div className="flex-shrink-0 rounded-sm flex items-center justify-center text-small text-[#666]"
                style={{ width: 16, height: 16, background: '#e8e8e8' }}>
                {(activeItem.title).charAt(0)}
              </div>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#F0C54F" stroke="#D4A830" strokeWidth="0.6">
                <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            )}
            <span className="ml-2 truncate text-body text-[#1a1a1a]">
              {activeItem.title}
            </span>
            {multiDragRef.current.length > 1 && (
              <span className="ml-2 flex-shrink-0 rounded-full bg-[#0078D4] text-white text-[10px] px-1.5 py-0.5 leading-none"
                style={{ minWidth: 18, textAlign: 'center' }}>
                {multiDragRef.current.length}
              </span>
            )}
          </div>
        )}
      </DragOverlay>

      <DropIndicator />
    </DndContext>
    <ToastContainer />
    </>
  )
}
