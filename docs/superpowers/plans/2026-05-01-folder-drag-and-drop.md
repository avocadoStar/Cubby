# Folder Tree Drag-and-Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-and-drop reordering + reparenting to the left sidebar folder tree with smooth visual feedback.

**Architecture:** Replace react-virtuoso with @tanstack/react-virtual in Sidebar (Virtuoso DOM recycling breaks sortable state). Use @dnd-kit/core + @dnd-kit/sortable for drag logic. Pointer tracking via pointermove listener + document.elementFromPoint() for collision detection. Drop indicator renders via createPortal.

**Tech Stack:** React 19, TypeScript, @dnd-kit/core ^6.3.1, @dnd-kit/sortable ^10.0.0, @tanstack/react-virtual, Zustand 5, Tailwind CSS 4

---

### Task 1: Install @tanstack/react-virtual

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Add @tanstack/react-virtual dependency**

```bash
cd e:/project/Cubby/frontend && npm install @tanstack/react-virtual
```

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add @tanstack/react-virtual for folder tree DnD

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Create dndStore.ts — drag state management

**Files:**
- Create: `frontend/src/stores/dndStore.ts`

- [ ] **Step 1: Create dndStore.ts**

```typescript
import { create } from 'zustand'
import type { Folder } from '../types'

interface DndState {
  activeId: string | null
  activeFolder: Folder | null
  overId: string | null
  dropPosition: 'before' | 'inside' | 'after' | null
  indicatorRect: { top: number; left: number; width: number } | null
  setActive: (id: string, folder: Folder) => void
  setOver: (
    id: string | null,
    position: 'before' | 'inside' | 'after' | null,
    rect?: { top: number; left: number; width: number } | null,
  ) => void
  clearDrag: () => void
}

export const useDndStore = create<DndState>((set) => ({
  activeId: null,
  activeFolder: null,
  overId: null,
  dropPosition: null,
  indicatorRect: null,

  setActive: (id, folder) =>
    set({ activeId: id, activeFolder: folder, overId: null, dropPosition: null, indicatorRect: null }),

  setOver: (id, position, rect) =>
    set({ overId: id, dropPosition: position, indicatorRect: rect ?? null }),

  clearDrag: () =>
    set({ activeId: null, activeFolder: null, overId: null, dropPosition: null, indicatorRect: null }),
}))
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd e:/project/Cubby/frontend && npx tsc --noEmit --pretty 2>&1 | head -10
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/dndStore.ts
git commit -m "feat: add dndStore for folder drag state management

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Add moveFolder to folderStore.ts

**Files:**
- Modify: `frontend/src/stores/folderStore.ts`

- [ ] **Step 1: Add moveFolder action to the interface and implementation**

The `moveFolder` action calls `api.moveFolder()`, handles conflicts by reloading, and refreshes affected parent folders' children.

Add to the `FolderState` interface (line 15, before `}`):

```typescript
  moveFolder: (
    id: string,
    newParentId: string | null,
    prevId: string | null,
    nextId: string | null,
    version: number,
  ) => Promise<void>
```

Add to the store implementation (line 112, after `create`):

```typescript
  moveFolder: async (id, newParentId, prevId, nextId, version) => {
    try {
      await api.moveFolder({ id, parent_id: newParentId, prev_id: prevId, next_id: nextId, version })

      // Reload children for old and new parent
      const { folderMap } = get()
      const folder = folderMap.get(id)
      const oldParentId = folder?.parent_id ?? null

      if (oldParentId !== newParentId) {
        await get().loadChildren(oldParentId)
      }
      await get().loadChildren(newParentId)

      get().rebuildVisible()
    } catch (e) {
      if (e instanceof (await import('../services/api')).ConflictError) {
        // Reload current view on conflict
        const { selectedId } = get()
        await get().loadChildren(selectedId)
        get().rebuildVisible()
      }
      throw e
    }
  },
```

The full `moveFolder` body replaces nothing — it's an insertion. The store closing line becomes:

```typescript
}))

export const useFolderStore = create<FolderState>((set, get) => ({
  // ... existing code unchanged up to create at line 112 ...
  moveFolder: async (id, newParentId, prevId, nextId, version) => {
    try {
      await api.moveFolder({ id, parent_id: newParentId, prev_id: prevId, next_id: nextId, version })
      const { folderMap } = get()
      const folder = folderMap.get(id)
      const oldParentId = folder?.parent_id ?? null
      if (oldParentId !== newParentId) {
        await get().loadChildren(oldParentId)
      }
      await get().loadChildren(newParentId)
      get().rebuildVisible()
    } catch (e) {
      if (e instanceof (await import('../services/api')).ConflictError) {
        const { selectedId } = get()
        await get().loadChildren(selectedId)
        get().rebuildVisible()
      }
      throw e
    }
  },
}))
```

Edit `frontend/src/stores/folderStore.ts`:
1. Add `moveFolder` to the `FolderState` interface after line 15
2. Add the `moveFolder` implementation after `create` (line 112, before `})`)

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd e:/project/Cubby/frontend && npx tsc --noEmit --pretty 2>&1 | head -10
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/folderStore.ts
git commit -m "feat: add moveFolder action to folderStore

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Create DropIndicator.tsx

**Files:**
- Create: `frontend/src/components/DropIndicator.tsx`

- [ ] **Step 1: Create DropIndicator component**

```typescript
import { createPortal } from 'react-dom'
import { useDndStore } from '../stores/dndStore'

export default function DropIndicator() {
  const indicatorRect = useDndStore((s) => s.indicatorRect)

  if (!indicatorRect) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: indicatorRect.top - 1.5,
        left: indicatorRect.left + 12,
        width: indicatorRect.width - 24,
        height: 3,
        background: '#0078D4',
        borderRadius: 2,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />,
    document.body,
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd e:/project/Cubby/frontend && npx tsc --noEmit --pretty 2>&1 | head -10
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DropIndicator.tsx
git commit -m "feat: add DropIndicator portal component for DnD visual feedback

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Rewrite FolderNode.tsx with drag support

**Files:**
- Modify: `frontend/src/components/FolderNode.tsx`

- [ ] **Step 1: Replace FolderNode with drag-aware version**

Rewrite `frontend/src/components/FolderNode.tsx`:

```typescript
import { memo } from 'react'
import type { Folder } from '../types'
import { useFolderStore } from '../stores/folderStore'
import { useDndStore } from '../stores/dndStore'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react'

const FolderNode = memo(({ node, depth }: { node: Folder; depth: number }) => {
  const { expandedIds, selectedId, childrenMap, toggleExpand, select } = useFolderStore()
  const activeId = useDndStore((s) => s.activeId)
  const overId = useDndStore((s) => s.overId)
  const dropPosition = useDndStore((s) => s.dropPosition)

  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const children = childrenMap.get(node.id)
  const hasChildren = children === undefined || children.length > 0
  const isDragging = activeId === node.id
  const isOverInside = overId === node.id && dropPosition === 'inside'

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: node.id })

  // Don't apply transform — we use indicator instead of sortable animation
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      data-droppable-id={node.id}
      className="flex items-center cursor-default rounded select-none group"
      style={{
        height: 32,
        paddingLeft: 8 + depth * 20,
        paddingRight: 8,
        margin: '0 4px',
        background: isOverInside ? '#E5F0FF' : isSelected ? '#E5F0FF' : 'transparent',
        opacity: isDragging ? 0.3 : 1,
        outline: isOverInside ? '2px solid #0078D4' : 'none',
        outlineOffset: -2,
        ...style,
      }}
      onClick={() => select(node.id)}
    >
      {/* Drag handle */}
      <span
        {...listeners}
        className="flex-shrink-0 flex items-center justify-center mr-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100"
        style={{ width: 16, height: 16 }}
      >
        <GripVertical size={12} stroke="#999" />
      </span>

      {/* Expand chevron */}
      <span
        className="flex-shrink-0 flex items-center justify-center"
        style={{ width: 16, height: 16 }}
        onClick={(e) => { e.stopPropagation(); toggleExpand(node.id) }}
      >
        {hasChildren && (
          isExpanded
            ? <ChevronDown size={12} stroke="#666" strokeWidth={2} />
            : <ChevronRight size={12} stroke="#666" strokeWidth={2} />
        )}
      </span>

      {/* Folder icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#F0C54F" stroke="#D4A830" strokeWidth="0.6" className="flex-shrink-0 ml-1">
        <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
      </svg>

      {/* Name */}
      <span className="ml-2 truncate text-[13px] text-[#1a1a1a]">{node.name}</span>
    </div>
  )
})

FolderNode.displayName = 'FolderNode'
export default FolderNode
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd e:/project/Cubby/frontend && npx tsc --noEmit --pretty 2>&1 | head -10
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/FolderNode.tsx
git commit -m "feat: add drag handle, sortable, and drop-into styles to FolderNode

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Rewrite Sidebar.tsx with DndContext + useVirtualizer + DragOverlay

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Replace Sidebar implementation**

Rewrite `frontend/src/components/Sidebar.tsx`:

```typescript
import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useFolderStore } from '../stores/folderStore'
import { useDndStore } from '../stores/dndStore'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import FolderNode from './FolderNode'
import DropIndicator from './DropIndicator'
import { Star, Search } from 'lucide-react'
import type { DragStartEvent, DragEndEvent, DragMoveEvent } from '@dnd-kit/core'

export default function Sidebar() {
  const { visibleNodes, selectedId, select, loadChildren, expandedIds, toggleExpand, folderMap, childrenMap, moveFolder } = useFolderStore()
  const { activeId, setActive, setOver, clearDrag } = useDndStore()
  const parentRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef({ x: 0, y: 0 })
  const hoverTimerRef = useRef<number>(0)
  const hoverTargetRef = useRef<string | null>(null)

  useEffect(() => { loadChildren(null) }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const virtualizer = useVirtualizer({
    count: visibleNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10,
  })

  const itemIds = useMemo(() => visibleNodes.map((n) => n.node.id), [visibleNodes])

  // Track pointer position during drag
  useEffect(() => {
    if (!activeId) return
    const handler = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('pointermove', handler)
    return () => window.removeEventListener('pointermove', handler)
  }, [activeId])

  const onDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string
    const folder = folderMap.get(id)
    if (folder) setActive(id, folder)
  }, [folderMap, setActive])

  const onDragMove = useCallback((event: DragMoveEvent) => {
    const { x, y } = pointerRef.current
    const over = event.over
    if (!over) {
      setOver(null, null)
      return
    }

    const overId = over.id as string
    if (overId === activeId) {
      setOver(null, null)
      return
    }

    const overEl = document.querySelector(`[data-droppable-id="${overId}"]`)
    if (!overEl) {
      setOver(null, null)
      return
    }

    const rect = overEl.getBoundingClientRect()
    const ratio = (y - rect.top) / rect.height
    const overFolder = folderMap.get(overId)
    const canDropInside = overFolder && overId !== activeId

    let position: 'before' | 'inside' | 'after'
    if (ratio < 0.25) {
      position = 'before'
    } else if (ratio > 0.75) {
      position = 'after'
    } else {
      position = canDropInside ? 'inside' : 'after'
    }

    const indicatorRect =
      position === 'before'
        ? { top: rect.top, left: rect.left + 8, width: rect.width - 16 }
        : position === 'after'
          ? { top: rect.bottom, left: rect.left + 8, width: rect.width - 16 }
          : null

    // Hover expand: start timer when hovering inside a collapsed folder
    if (position === 'inside' && overId !== hoverTargetRef.current && !expandedIds.has(overId)) {
      clearTimeout(hoverTimerRef.current)
      hoverTargetRef.current = overId
      hoverTimerRef.current = window.setTimeout(() => {
        toggleExpand(overId)
        hoverTargetRef.current = null
      }, 500)
    } else if (position !== 'inside') {
      clearTimeout(hoverTimerRef.current)
      hoverTargetRef.current = null
    }

    setOver(overId, position, indicatorRect)
  }, [activeId, folderMap, expandedIds, toggleExpand, setOver])

  const onDragEnd = useCallback((event: DragEndEvent) => {
    clearTimeout(hoverTimerRef.current)
    hoverTargetRef.current = null

    const { active } = event
    const { overId: finalOverId, dropPosition, activeFolder } = useDndStore.getState()

    if (!activeFolder || !finalOverId || !dropPosition || finalOverId === active.id) {
      clearDrag()
      return
    }

    const targetFolder = folderMap.get(finalOverId)
    if (!targetFolder) {
      clearDrag()
      return
    }

    // Prevent dropping into self or descendants
    const isDescendant = (ancestorId: string, childId: string): boolean => {
      const childIds = childrenMap.get(ancestorId) || []
      if (childIds.includes(childId)) return true
      for (const cid of childIds) {
        if (isDescendant(cid, childId)) return true
      }
      return false
    }

    if (isDescendant(active.id as string, finalOverId)) {
      clearDrag()
      return
    }

    // Compute the items in the target's parent for prev/next calculation
    const targetParentId = targetFolder.parent_id
    const siblings = childrenMap.get(targetParentId) || []
    const targetIndex = siblings.indexOf(finalOverId)

    let newParentId: string | null
    let prevId: string | null
    let nextId: string | null

    if (dropPosition === 'inside') {
      newParentId = finalOverId
      prevId = null
      nextId = null // append to end of new parent
    } else if (dropPosition === 'before') {
      newParentId = targetParentId
      prevId = targetIndex > 0 ? siblings[targetIndex - 1] : null
      nextId = finalOverId
    } else {
      // after
      newParentId = targetParentId
      prevId = finalOverId
      nextId = targetIndex < siblings.length - 1 ? siblings[targetIndex + 1] : null
    }

    moveFolder(active.id as string, newParentId, prevId, nextId, activeFolder.version).catch(() => {})
    clearDrag()
  }, [folderMap, childrenMap, moveFolder, clearDrag])

  const scrollToIndexRef = useRef<number | null>(null)
  useEffect(() => {
    if (scrollToIndexRef.current !== null) {
      virtualizer.scrollToIndex(scrollToIndexRef.current, { align: 'center' })
      scrollToIndexRef.current = null
    }
  })

  // Collect all ancestor ids of the active folder (for disable-drag-into-self)
  const activeAncestorIds = useMemo(() => {
    if (!activeId) return new Set<string>()
    const ancestors = new Set<string>()
    let current = activeId
    while (current) {
      const f = folderMap.get(current)
      if (!f || !f.parent_id) break
      ancestors.add(f.parent_id)
      current = f.parent_id
    }
    return ancestors
  }, [activeId, folderMap])

  return (
    <div className="w-[280px] min-w-[280px] border-r border-[#e8e8e8] flex flex-col bg-white h-full">
      <div className="pt-5 px-5 pb-3 text-lg font-semibold text-[#1a1a1a]">收藏夹</div>
      <div className="px-4 pb-2">
        <div className="flex items-center h-8 border border-[#d1d1d1] rounded px-2 gap-1.5">
          <Search size={14} stroke="#888" />
          <input
            className="flex-1 border-none outline-none text-[13px] bg-transparent"
            placeholder="搜索收藏夹"
          />
        </div>
      </div>
      <div
        className="flex items-center h-8 mx-1 px-2 rounded cursor-default select-none"
        style={{ background: selectedId === null ? '#E5F0FF' : 'transparent', margin: '0 4px' }}
        onClick={() => select(null)}
      >
        <Star size={16} stroke={selectedId === null ? '#0078D4' : '#1a1a1a'} strokeWidth={1.6} />
        <span className="ml-2.5 text-[13px] text-[#1a1a1a]">所有书签</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div ref={parentRef} className="flex-1 overflow-y-auto">
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const { node, depth } = visibleNodes[virtualItem.index]
                return (
                  <div
                    key={node.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: virtualItem.size,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <FolderNode node={node} depth={depth} />
                  </div>
                )
              })}
            </div>
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeId ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 32,
                padding: '0 8px',
                background: '#fff',
                borderRadius: 4,
                opacity: 0.85,
                boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                border: '1px solid #e0e0e0',
              }}
            >
              <span style={{ width: 16, marginRight: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                  <circle cx="9" cy="5" r="1.5" fill="#999" /><circle cx="15" cy="5" r="1.5" fill="#999" />
                  <circle cx="9" cy="12" r="1.5" fill="#999" /><circle cx="15" cy="12" r="1.5" fill="#999" />
                  <circle cx="9" cy="19" r="1.5" fill="#999" /><circle cx="15" cy="19" r="1.5" fill="#999" />
                </svg>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#F0C54F" stroke="#D4A830" strokeWidth="0.6" style={{ flexShrink: 0, marginLeft: 4 }}>
                <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
              </svg>
              <span className="ml-2 truncate text-[13px] text-[#1a1a1a]">
                {folderMap.get(activeId)?.name ?? ''}
              </span>
            </div>
          ) : null}
        </DragOverlay>

        <DropIndicator />
      </DndContext>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd e:/project/Cubby/frontend && npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors

- [ ] **Step 3: Build verification**

```bash
cd e:/project/Cubby/frontend && npm run build 2>&1 | tail -10
```
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Sidebar.tsx
git commit -m "feat: implement folder tree DnD with DndContext + useVirtualizer + DragOverlay

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Verification

After all tasks complete:

1. `npm run dev` — start the dev server
2. Expand a folder with children in the left sidebar
3. Drag a folder by its grip handle (⋮⋮ appears on hover)
4. Verify:
   - Dragged folder shows at 30% opacity in original position
   - Drag overlay follows cursor with 85% opacity + shadow
   - Drop indicator (blue line) appears between rows on before/after
   - Target folder highlights with blue border on inside
   - Hovering over collapsed folder for 500ms auto-expands it
   - Dropping reorders within same parent
   - Dropping inside another folder changes parent (visible after reload)
   - Cannot drop into self or descendant
   - Click on folder row still navigates
   - Click on chevron still toggles expand
