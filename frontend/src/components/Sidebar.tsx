import { useEffect, useRef, useCallback, useMemo, type CSSProperties } from 'react'
import { useFolderStore } from '../stores/folderStore'
import { useDndStore } from '../stores/dndStore'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import FolderNode from './FolderNode'
import DropIndicator from './DropIndicator'
import { Star, Search } from 'lucide-react'

// Module-level so reference is stable across renders — prevents
// useSensor from recreating the sensor descriptor on every render,
// which would reset PointerSensor mid-drag and kill onDragMove.
const POINTER_SENSOR_CONFIG = {
  activationConstraint: { distance: 5 },
  onActivation({ event }: { event: Event }) {
    console.log('[DEBUG-dnd] PointerSensor onActivation', {
      type: event.type,
      target: (event.target as HTMLElement | null)?.tagName ?? null,
    })
  },
} as const

function calcDropPosition(
  rect: DOMRect,
  pointerY: number,
): 'before' | 'inside' | 'after' {
  const relY = pointerY - rect.top
  const h = rect.height
  if (relY < h * 0.25) return 'before'
  if (relY > h * 0.75) return 'after'
  return 'inside'
}

/** "所有书签" row rendered as a droppable (target for moving to root level). */
function AllBookmarksDroppable({
  isSelected,
  onSelect,
}: {
  isSelected: boolean
  onSelect: () => void
}) {
  const { setNodeRef } = useDroppable({
    id: 'all-bookmarks',
    data: { isRoot: true },
  })

  return (
    <div
      ref={setNodeRef}
      data-id="all-bookmarks"
      className="flex items-center h-8 mx-1 px-2 rounded cursor-default select-none"
      style={{
        margin: '0 4px',
        background: isSelected ? '#E5F0FF' : 'transparent',
      }}
      onClick={onSelect}
    >
      <Star
        size={16}
        stroke={isSelected ? '#0078D4' : '#1a1a1a'}
        strokeWidth={1.6}
      />
      <span className="ml-2.5 text-[13px] text-[#1a1a1a]">所有书签</span>
    </div>
  )
}

/** Wrapper that registers a droppable zone for each virtual folder row.
 *  Separated from FolderNode so useDroppable and useDraggable live on
 *  different DOM elements — avoids registration conflicts. */
function DroppableWrapper({
  nodeId,
  activeId,
  folderMap,
  style,
  children,
}: {
  nodeId: string
  activeId: string | null
  folderMap: Map<string, { parent_id: string | null }>
  style: CSSProperties
  children: React.ReactNode
}) {
  const invalidDrop = useMemo(() => {
    if (!activeId) return false
    if (activeId === nodeId) return true
    // Walk up parent chain: if activeId is an ancestor, this node is a descendant
    let current: string | null = nodeId
    while (current) {
      const f = folderMap.get(current)
      if (!f || !f.parent_id) break
      if (f.parent_id === activeId) return true
      current = f.parent_id
    }
    return false
  }, [activeId, nodeId, folderMap])

  const { setNodeRef } = useDroppable({
    id: `droppable:${nodeId}`,
    data: { nodeId },
    disabled: invalidDrop,
  })

  return (
    <div
      ref={setNodeRef}
      data-drop-id={`droppable:${nodeId}`}
      style={{
        ...style,
        touchAction: 'none',
      }}
    >
      {children}
    </div>
  )
}

export default function Sidebar() {
  const {
    visibleNodes,
    selectedId,
    select,
    loadChildren,
    folderMap,
    childrenMap,
    moveFolder,
  } = useFolderStore()
  const { setActive, setOver, clearDrag, activeFolder, activeId } = useDndStore()

  console.warn('[DEBUG-dnd] Sidebar RENDER', { nodes: visibleNodes.length, activeId })

  const scrollRef = useRef<HTMLDivElement>(null)
  const initialPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    loadChildren(null)
  }, [])

  const rowVirtualizer = useVirtualizer({
    count: visibleNodes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 10,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_SENSOR_CONFIG),
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      console.log('[DEBUG-dnd] DndContext onDragStart', {
        activeId: String(event.active.id),
      })

      const id = String(event.active.id)
      const folder = folderMap.get(id)
      if (!folder) return
      setActive(id, folder)

      const ev = event.activatorEvent as PointerEvent | MouseEvent
      initialPointerRef.current = { x: ev.clientX, y: ev.clientY }
    },
    [folderMap, setActive],
  )

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const over = event.over
      const overId = over ? String(over.id) : null

      console.log('[DEBUG-dnd] onDragMove', {
        activeId: String(event.active.id),
        overId,
        delta: event.delta,
      })

      if (!over || !overId) {
        console.warn('[DEBUG-dnd] onDragMove NO OVER - clearing indicator')
        setOver(null, null, null)
        return
      }

      const el =
        document.querySelector(`[data-drop-id="${overId}"]`) ||
        document.querySelector(`[data-id="${overId}"]`)
      if (!el) {
        console.warn('[DEBUG-dnd] onDragMove NO DOM ELEMENT for', overId)
        return
      }

      const rect = el.getBoundingClientRect()
      const { y: startY } = initialPointerRef.current
      const currentY = startY + event.delta.y
      const position = calcDropPosition(rect, currentY)

      console.log('[DEBUG-dnd] onDragMove indicator', {
        overId,
        position,
        rect: { top: rect.top, bottom: rect.bottom, height: rect.height },
        pointerY: currentY,
        ratio: ((currentY - rect.top) / rect.height).toFixed(2),
      })

      if (position === 'inside') {
        if (overId === 'all-bookmarks') {
          setOver(overId, 'inside', { top: rect.top, left: rect.left, width: rect.width })
        } else {
          setOver(overId, 'inside', null)
        }
      } else if (position === 'before') {
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
    },
    [setOver],
  )

  const handleDragEnd = useCallback(
    async (_event: DragEndEvent) => {
      const debugState = useDndStore.getState()

      console.log('[DEBUG-dnd] DndContext onDragEnd', {
        activeId: debugState.activeId,
        overId: debugState.overId,
        dropPosition: debugState.dropPosition,
      })

      const state = useDndStore.getState()
      const { activeId: dragId, activeFolder: dragFolder, overId, dropPosition } = state

      if (!dragId || !overId || !dropPosition || !dragFolder) {
        clearDrag()
        return
      }

      let newParentId: string | null = null
      let prevId: string | null = null
      let nextId: string | null = null

      try {
        if (overId === 'all-bookmarks') {
          newParentId = null
          const siblings = childrenMap.get(null) ?? []
          const idx = siblings.indexOf(dragId)
          if (idx > 0) prevId = siblings[idx - 1]
          if (idx >= 0 && idx + 1 < siblings.length) nextId = siblings[idx + 1]
        } else {
          const folderId = overId.startsWith('droppable:')
            ? overId.slice('droppable:'.length)
            : overId
          const targetFolder = folderMap.get(folderId)
          if (!targetFolder) {
            clearDrag()
            return
          }

          if (dropPosition === 'inside') {
            newParentId = folderId
            const siblings = childrenMap.get(folderId) ?? []
            if (siblings.length > 0) prevId = siblings[siblings.length - 1]
            nextId = null
          } else if (dropPosition === 'before') {
            newParentId = targetFolder.parent_id
            const siblings = childrenMap.get(newParentId) ?? []
            const targetIdx = siblings.indexOf(folderId)
            prevId = targetIdx > 0 ? siblings[targetIdx - 1] : null
            nextId = folderId
          } else {
            newParentId = targetFolder.parent_id
            const siblings = childrenMap.get(newParentId) ?? []
            const targetIdx = siblings.indexOf(folderId)
            prevId = folderId
            nextId =
              targetIdx >= 0 && targetIdx + 1 < siblings.length
                ? siblings[targetIdx + 1]
                : null
          }
        }

        await moveFolder(dragId, newParentId, prevId, nextId, dragFolder.version)
      } catch (e) {
        console.error('Folder move failed', e)
      }

      clearDrag()
    },
    [folderMap, childrenMap, moveFolder, clearDrag],
  )

  const handleDragCancel = useCallback(() => {
    console.log('[DEBUG-dnd] DndContext onDragCancel')
    clearDrag()
  }, [clearDrag])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="w-[280px] min-w-[280px] border-r border-[#e8e8e8] flex flex-col bg-white h-full">
        {/* Title */}
        <div className="pt-5 px-5 pb-3 text-lg font-semibold text-[#1a1a1a]">
          收藏夹
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="flex items-center h-8 border border-[#d1d1d1] rounded px-2 gap-1.5">
            <Search size={14} stroke="#888" />
            <input
              className="flex-1 border-none outline-none text-[13px] bg-transparent"
              placeholder="搜索收藏夹"
            />
          </div>
        </div>

        {/* "所有书签" (also a droppable root target) */}
        <AllBookmarksDroppable
          isSelected={selectedId === null}
          onSelect={() => select(null)}
        />

        {/* Virtualized folder tree */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const item = visibleNodes[virtualItem.index]
              return (
                <DroppableWrapper
                  key={item.node.id}
                  nodeId={item.node.id}
                  activeId={activeId}
                  folderMap={folderMap as Map<string, { parent_id: string | null }>}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <FolderNode node={item.node} depth={item.depth} />
                </DroppableWrapper>
              )
            })}
          </div>
        </div>
      </div>

      {/* Drag overlay preview */}
      <DragOverlay dropAnimation={null}>
        {activeFolder && (
          <div
            className="flex items-center rounded select-none bg-white"
            style={{
              height: 32,
              paddingLeft: 8,
              paddingRight: 8,
              opacity: 0.85,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transform: 'scale(1.02)',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="#F0C54F"
              stroke="#D4A830"
              strokeWidth="0.6"
            >
              <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            <span className="ml-2 truncate text-[13px] text-[#1a1a1a]">
              {activeFolder.name}
            </span>
          </div>
        )}
      </DragOverlay>

      {/* Drop indicator line */}
      <DropIndicator />
    </DndContext>
  )
}
