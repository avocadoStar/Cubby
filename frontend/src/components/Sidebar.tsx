import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
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
      <span className="ml-2.5 text-body text-[#1a1a1a]">所有书签</span>
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
  } = useFolderStore()
  const { activeId } = useDndStore()
  const searchStore = useSearchStore()
  const [query, setQuery] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) {
      searchStore.clearSearch()
      return
    }
    debounceRef.current = setTimeout(() => {
      searchStore.search(query)
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  useEffect(() => {
    loadChildren(null)
  }, [])

  const rowVirtualizer = useVirtualizer({
    count: visibleNodes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 10,
  })

  return (
    <div className="w-[280px] min-w-[280px] border-r border-[#e8e8e8] flex flex-col bg-white h-full">
        <div className="pt-5 px-5 pb-3 text-lg font-semibold text-[#1a1a1a]">
          收藏夹
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center h-8 border border-[#d1d1d1] rounded px-2 gap-1.5">
            <Search size={14} stroke="#888" />
            <input
              className="flex-1 border-none outline-none text-body bg-transparent"
              placeholder="搜索收藏夹"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <div
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full cursor-default"
                style={{ background: '#d1d1d1', color: '#fff' }}
                onClick={() => {
                  setQuery('')
                  searchStore.clearSearch()
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
  )
}
