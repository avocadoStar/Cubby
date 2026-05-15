import { useEffect, useRef, useMemo, useState } from 'react'
import { useFolderStore } from '../stores/folderStore'
import { useDndStore } from '../stores/dndStore'
import { useSearchStore } from '../stores/searchStore'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useDroppable } from '@dnd-kit/core'
import FolderNode from './FolderNode'
import { Star, Search } from 'lucide-react'

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
      className="flex items-center h-8 mx-1 px-2 rounded cursor-pointer select-none rounded-card"
      style={{
        background: isSelected ? 'var(--accent-light)' : 'transparent',
        boxShadow: isSelected ? 'var(--input-shadow)' : 'none',
      }}
      onClick={onSelect}
    >
      <Star
        size={16}
        stroke={isSelected ? 'var(--app-accent)' : 'var(--app-text)'}
        strokeWidth={1.6}
      />
      <span className="ml-2.5 text-body text-app-text">所有书签</span>
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
    id: `droppable:sidebar:${nodeId}`,
    data: { nodeId },
    disabled: invalidDrop,
  })

  return (
    <div
      ref={setNodeRef}
      data-drop-id={`droppable:sidebar:${nodeId}`}
      className="touch-none"
      style={style}
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
  } = useFolderStore()
  const { activeId } = useDndStore()
  const search = useSearchStore((state) => state.search)
  const clearSearch = useSearchStore((state) => state.clearSearch)
  const [query, setQuery] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) {
      clearSearch()
      return
    }
    debounceRef.current = setTimeout(() => {
      search(query)
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [clearSearch, query, search])

  useEffect(() => {
    loadChildren(null)
  }, [loadChildren])

  const rowVirtualizer = useVirtualizer({
    count: visibleNodes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 10,
  })

  return (
    <div className="w-[280px] min-w-[280px] flex flex-col h-full border-r-[var(--sidebar-border)] bg-app-card shadow-[var(--sidebar-shadow)]">
        <div className="pt-5 px-5 pb-3 text-lg font-semibold text-app-text">
          收藏夹
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center h-8 px-2 gap-1.5 border border-input-border rounded-input shadow-input-base bg-input-bg">
            <Search size={14} stroke="var(--app-text2)" />
            <input
              className="flex-1 border-none outline-none text-body bg-transparent text-app-text"
              placeholder="搜索收藏夹"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <div
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full cursor-pointer bg-[var(--app-text3)] text-[var(--text-on-accent)]"
                onClick={() => {
                  setQuery('')
                  clearSearch()
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
            )}
          </div>
        </div>

        <AllBookmarksDroppable
          isSelected={selectedId === null}
          onSelect={() => select(null)}
        />

        {/* Virtualized folder tree */}
        <div ref={scrollRef} role="tree" aria-label="文件夹" className="flex-1 overflow-auto theme-scrollbar">
          <div
            className="relative"
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
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
  )
}
