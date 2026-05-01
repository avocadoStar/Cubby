import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useFolderStore } from '../stores/folderStore'
import { useDndStore } from '../stores/dndStore'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  getClientRect,
  useSensor,
  useSensors,
  useDroppable,
  type CollisionDetection,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import FolderNode from './FolderNode'
import DropIndicator from './DropIndicator'
import { Star, Search } from 'lucide-react'

// Module-level so reference is stable across renders
const POINTER_SENSOR_CONFIG = { activationConstraint: { distance: 5 } } as const

/** Custom collision detection: like closestCenter but uses pointer coords instead of draggable origin.
 *  This makes the drop target follow the actual cursor, not the drag start point. */
function pointerClosestCenter(args: Parameters<CollisionDetection>[0]) {
  const { droppableContainers, pointerCoordinates } = args

  if (!pointerCoordinates) return []

  let closestDistance = Infinity
  let closestId: string | null = null

  for (const container of droppableContainers) {
    const rect = container.rect.current
    if (!rect) continue

    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = pointerCoordinates.x - centerX
    const dy = pointerCoordinates.y - centerY
    const distance = dx * dx + dy * dy // squared distance, no need for sqrt

    if (distance < closestDistance) {
      closestDistance = distance
      closestId = container.id as string
    }
  }

  return closestId ? [{ id: closestId }] : []
}

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

/** "所有书签" row as a droppable (target for moving to root level). */
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

/** Wrapper that registers a droppable zone for each virtual folder row. */
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
  style: React.CSSProperties
  children: React.ReactNode
}) {
  const invalidDrop = useMemo(() => {
    if (!activeId) return false
    if (activeId === nodeId) return true
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
      style={{ ...style, touchAction: 'none' }}
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

  const scrollRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

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

  // Track pointer position during drag for accurate before/inside/after calculation
  useEffect(() => {
    if (!activeId) return
    const handler = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('pointermove', handler)
    return () => window.removeEventListener('pointermove', handler)
  }, [activeId])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id)
      const folder = folderMap.get(id)
      if (!folder) return
      setActive(id, folder)
      // Seed pointer position from activator event
      const ev = event.activatorEvent as PointerEvent | MouseEvent
      pointerRef.current = { x: ev.clientX, y: ev.clientY }
    },
    [folderMap, setActive],
  )

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const over = event.over
      if (!over) {
        setOver(null, null, null)
        return
      }

      const overId = String(over.id)

      // Find the DOM element for the droppable
      const el =
        document.querySelector(`[data-drop-id="${overId}"]`) ||
        document.querySelector(`[data-id="${overId}"]`)
      if (!el) {
        setOver(null, null, null)
        return
      }

      const rect = el.getBoundingClientRect()
      const position = calcDropPosition(rect, pointerRef.current.y)

      if (position === 'inside') {
        if (overId === 'all-bookmarks') {
          setOver(overId, 'inside', {
            top: rect.top,
            left: rect.left,
            width: rect.width,
          })
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
    [activeId, setOver],
  )

  const handleDragEnd = useCallback(
    async (_event: DragEndEvent) => {
      const state = useDndStore.getState()
      const { activeId: dragId, activeFolder: dragFolder, overId, dropPosition } = state

      if (!dragId || !overId || !dropPosition || !dragFolder) {
        clearDrag()
        return
      }

      let newParentId: string | null = null
      let prevId: string | null = null
      let nextId: string | null = null
      const sourceParentId = dragFolder.parent_id ?? null

      const getSiblingsExcludingDragged = (parentId: string | null) =>
        (childrenMap.get(parentId) ?? []).filter(id => id !== dragId)

      const getHeadPlacement = (parentId: string | null) => {
        const siblings = getSiblingsExcludingDragged(parentId)
        return {
          prevId: null as string | null,
          nextId: siblings.length > 0 ? siblings[0] : null,
        }
      }

      const getTailPlacement = (parentId: string | null) => {
        const siblings = getSiblingsExcludingDragged(parentId)
        return {
          prevId: siblings.length > 0 ? siblings[siblings.length - 1] : null,
          nextId: null as string | null,
        }
      }

      const getPlacementAroundSibling = (
        parentId: string | null,
        siblingId: string,
        position: 'before' | 'after',
      ) => {
        const siblings = getSiblingsExcludingDragged(parentId)
        const siblingIdx = siblings.indexOf(siblingId)
        if (siblingIdx === -1) {
          return null
        }

        const insertIdx = position === 'before' ? siblingIdx : siblingIdx + 1
        return {
          prevId: insertIdx > 0 ? siblings[insertIdx - 1] : null,
          nextId: insertIdx < siblings.length ? siblings[insertIdx] : null,
        }
      }

      try {
        if (overId === 'all-bookmarks') {
          newParentId = null
          const rootSiblings = getSiblingsExcludingDragged(null)

          if (dropPosition === 'before') {
            ;({ prevId, nextId } = getHeadPlacement(null))
          } else if (dropPosition === 'after') {
            ;({ prevId, nextId } = getTailPlacement(null))
          } else {
            const idx = rootSiblings.indexOf(dragId)
            if (idx >= 0) {
              prevId = idx > 0 ? rootSiblings[idx - 1] : null
              nextId = idx + 1 < rootSiblings.length ? rootSiblings[idx + 1] : null
            } else {
              ;({ prevId, nextId } = getTailPlacement(null))
            }
          }
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
            if (sourceParentId === folderId) {
              ;({ prevId, nextId } = getHeadPlacement(folderId))
            } else {
              ;({ prevId, nextId } = getTailPlacement(folderId))
            }
          } else if (dropPosition === 'before') {
            newParentId = targetFolder.parent_id
            const placement = getPlacementAroundSibling(newParentId, folderId, 'before')
            if (!placement) {
              clearDrag()
              return
            }
            ;({ prevId, nextId } = placement)
          } else {
            newParentId = targetFolder.parent_id
            const placement = getPlacementAroundSibling(newParentId, folderId, 'after')
            if (!placement) {
              clearDrag()
              return
            }
            ;({ prevId, nextId } = placement)
          }
        }

        console.warn('[DND-END]', { dragId, newParentId, prevId, nextId, overId, dropPosition, sourceParent: dragFolder.parent_id })
        await moveFolder(dragId, newParentId, prevId, nextId, dragFolder.version)
      } catch (e) {
        console.error('Folder move failed', e)
      }

      clearDrag()
    },
    [folderMap, childrenMap, moveFolder, clearDrag],
  )

  const handleDragCancel = useCallback(() => {
    clearDrag()
  }, [clearDrag])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerClosestCenter}
      measuring={{
        droppable: {
          measure: getClientRect,
        },
      }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="w-[280px] min-w-[280px] border-r border-[#e8e8e8] flex flex-col bg-white h-full">
        <div className="pt-5 px-5 pb-3 text-lg font-semibold text-[#1a1a1a]">
          收藏夹
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center h-8 border border-[#d1d1d1] rounded px-2 gap-1.5">
            <Search size={14} stroke="#888" />
            <input
              className="flex-1 border-none outline-none text-[13px] bg-transparent"
              placeholder="搜索收藏夹"
            />
          </div>
        </div>

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

      <DropIndicator />
    </DndContext>
  )
}
