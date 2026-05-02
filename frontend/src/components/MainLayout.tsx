import Sidebar from './Sidebar'
import Toolbar from './Toolbar'
import BookmarkRow from './BookmarkRow'
import BatchActionBar from './BatchActionBar'
import ContextMenu from './ContextMenu'
import DropIndicator from './DropIndicator'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useFolderStore } from '../stores/folderStore'
import { useDndStore } from '../stores/dndStore'
import { useEffect, useMemo, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  getClientRect,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { POINTER_SENSOR_CONFIG, pointerClosestCenter, calcDropPosition, computePlacement, getUnifiedSiblings, type UnifiedSortableItem } from '../lib/dndUtils'
import type { Folder, Bookmark } from '../types'
import { ChevronRight } from 'lucide-react'

type ListItem =
  | { kind: 'folder'; folder: Folder }
  | { kind: 'bookmark'; bookmark: Bookmark }

/** Droppable wrapper for each right-panel item (folder or bookmark). */
function ItemDroppable({
  item,
  activeId,
  folderMap,
  style,
  children,
}: {
  item: ListItem
  activeId: string | null
  folderMap: Map<string, Folder>
  style: React.CSSProperties
  children: React.ReactNode
}) {
  const nodeId = item.kind === 'folder' ? item.folder.id : item.bookmark.id
  const dropId = `droppable:${nodeId}`

  // Disable dropping on self, or on descendants of the dragged folder
  const disabled = useMemo(() => {
    if (!activeId || activeId === dropId) return false
    const activeFolderId = activeId.startsWith('droppable:') ? activeId.slice('droppable:'.length) : activeId
    if (activeFolderId === nodeId) return true

    // Check if this node is a descendant of the dragged folder
    let current: string | null = nodeId
    while (current) {
      const f = folderMap.get(current)
      if (!f || !f.parent_id) break
      if (f.parent_id === activeFolderId) return true
      current = f.parent_id
    }
    return false
  }, [activeId, nodeId, dropId, folderMap])

  const { setNodeRef } = useDroppable({ id: dropId, data: { item }, disabled })

  return (
    <div
      ref={setNodeRef}
      data-drop-id={dropId}
      style={{ ...style, touchAction: 'none' }}
    >
      {children}
    </div>
  )
}

/** Inline folder row rendered in the right panel. */
function FolderRowComponent({
  folder,
  isFolderSelected,
  onToggleSelect,
  onNavigate,
  isDragging,
  isInside,
}: {
  folder: Folder
  isFolderSelected: boolean
  onToggleSelect: () => void
  onNavigate: () => void
  isDragging: boolean
  isInside: boolean
}) {
  return (
    <div
      data-context="folder"
      data-id={folder.id}
      className="flex items-center mx-1 px-2 rounded select-none cursor-default"
      style={{
        height: 32,
        opacity: isDragging ? 0.3 : 1,
        background: isInside ? '#E5F0FF' : isFolderSelected ? '#E5F0FF' : 'transparent',
        outline: isInside ? '1px solid #0078D4' : undefined,
        outlineOffset: -1,
        touchAction: 'none',
      }}
      onClick={onNavigate}
    >
      <div
        className="flex-shrink-0 mr-2.5 flex items-center justify-center cursor-default"
        style={{
          width: 18, height: 18,
          borderRadius: '50%',
          border: isFolderSelected ? '2px solid #0078D4' : '2px solid #c0c0c0',
          background: isFolderSelected ? '#0078D4' : 'transparent',
        }}
        onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
      >
        {isFolderSelected && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#F0C54F" stroke="#D4A830" strokeWidth="0.6" className="flex-shrink-0 mr-2">
        <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
      </svg>
      <span className="flex-1 truncate text-[13px] text-[#1a1a1a]">{folder.name}</span>
      <span className="flex-shrink-0 text-xs text-[#888] mr-8" style={{ width: 320 }}>文件夹</span>
      <span className="flex-shrink-0 text-xs text-[#888]" style={{ width: 100, minWidth: 100 }} />
      <ChevronRight size={14} stroke="#999" strokeWidth={1.5} className="flex-shrink-0" />
    </div>
  )
}

/** Draggable folder row wrapper. */
function DraggableFolderRow({
  folder,
  isFolderSelected,
  onToggleSelect,
  onNavigate,
}: {
  folder: Folder
  isFolderSelected: boolean
  onToggleSelect: () => void
  onNavigate: () => void
}) {
  const overId = useDndStore((s) => s.overId)
  const dropPosition = useDndStore((s) => s.dropPosition)
  const dndSource = useDndStore((s) => s.source)
  const isOver = overId === `droppable:${folder.id}`
  const isInside = isOver && dropPosition === 'inside' && dndSource === 'main'

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: folder.id,
    data: { kind: 'folder', folder },
  })

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <FolderRowComponent
        folder={folder}
        isFolderSelected={isFolderSelected}
        onToggleSelect={onToggleSelect}
        onNavigate={onNavigate}
        isDragging={isDragging}
        isInside={isInside}
      />
    </div>
  )
}

export default function MainLayout() {
  const { bookmarks, load, selectAll, selectedIds, selectedFolderIds, toggleFolderSelect } = useBookmarkStore()
  const { selectedId, childrenMap, folderMap, select } = useFolderStore()
  const { setActive, setOver, clearDrag, activeFolder, activeId } = useDndStore()

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
    estimateSize: () => 32,
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
      setActive(id, dragData.node as Folder, 'sidebar', 'folder')
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
        multiDragRef.current = [...fIds, ...bIds]
      } else {
        multiDragRef.current = [rawId]
      }
      setActive(id, item.kind === 'folder' ? (item.folder as unknown as Folder & { parent_id?: string | null }) : ({
        ...item.bookmark,
        parent_id: item.bookmark.folder_id,
      } as unknown as Folder & { parent_id?: string | null }), 'main', item.kind)
    }
  }, [items, setActive, selectedIds, selectedFolderIds])

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
    const { activeId: dragId, activeFolder: dragItem, overId, dropPosition } = dndState

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

    // Extract target folder ID from overId
    let targetId = overId
    if (targetId.startsWith('droppable:sidebar:')) targetId = targetId.slice('droppable:sidebar:'.length)
    else if (targetId.startsWith('droppable:')) targetId = targetId.slice('droppable:'.length)

    // Look up target: try items (right panel), then folderMap (sidebar), then bookmarks
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

      if (isDraggedFolder) {
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

    // Multi-select: move remaining selected items to the same destination
    if (multiDragRef.current.length > 1) {
      const destParentId = isDraggedFolder
        ? (targetItem?.kind === 'folder' && dropPosition === 'inside' ? targetItem.folder.id : targetItem?.kind === 'folder' ? targetItem.folder.parent_id : targetItem?.kind === 'bookmark' ? targetItem.bookmark.folder_id : null)
        : (targetItem?.kind === 'folder' ? (dropPosition === 'inside' ? targetItem.folder.id : targetItem.folder.parent_id) : targetItem?.kind === 'bookmark' ? targetItem.bookmark.folder_id : null)

      for (const selId of multiDragRef.current) {
        const strippedId = selId.startsWith('bookmark:') ? selId.slice('bookmark:'.length) : selId
        if (strippedId === itemDragId) continue

        const isBM = selId.startsWith('bookmark:')
        try {
          if (isBM) {
            const b = useBookmarkStore.getState().bookmarks.find(bk => bk.id === strippedId)
            if (b) {
              await useBookmarkStore.getState().move(strippedId, destParentId, null, null, b.version)
            }
          } else {
            const f = useFolderStore.getState().folderMap.get(strippedId)
            if (f) {
              await useFolderStore.getState().moveFolder(strippedId, destParentId, null, null, f.version)
            }
          }
        } catch (e) { console.error('Multi-move failed for', strippedId, e) }
      }
    }
    multiDragRef.current = []

    clearDrag()
  }, [items, renderedItems, clearDrag])

  const handleDragCancel = useCallback(() => {
    clearDrag()
  }, [clearDrag])

  return (
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
          <div className="flex-1" ref={scrollRef} style={{ overflow: 'auto' }}>
            <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((vi) => {
                const item = items[vi.index]
                const wrapperStyle: React.CSSProperties = {
                  position: 'absolute',
                  top: 0,
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
                    <BookmarkRow bookmark={item.bookmark} />
                  </ItemDroppable>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeFolder && (
          <div
            className="flex items-center rounded select-none bg-white"
            style={{
              height: 32,
              maxWidth: 200,
              paddingLeft: 8,
              paddingRight: 8,
              opacity: 0.85,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transform: 'translate(4px, 4px) scale(1.02)',
              transformOrigin: 'top left',
            }}
          >
            {useDndStore.getState().activeKind === 'bookmark' ? (
              <div className="flex-shrink-0 rounded-sm flex items-center justify-center text-[9px] text-[#666]"
                style={{ width: 16, height: 16, background: '#e8e8e8' }}>
                {(activeFolder.name ?? '').charAt(0)}
              </div>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#F0C54F" stroke="#D4A830" strokeWidth="0.6">
                <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            )}
            <span className="ml-2 truncate text-[13px] text-[#1a1a1a]">
              {activeFolder.name ?? ''}
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
  )
}
