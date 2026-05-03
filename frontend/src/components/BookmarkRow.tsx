import { memo, useState } from 'react'
import type { Bookmark } from '../types'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useDndStore } from '../stores/dndStore'
import { useDraggable } from '@dnd-kit/core'

const BookmarkRow = memo(({ bookmark }: { bookmark: Bookmark }) => {
  const { selectedIds, toggleSelect, deleteOne, deletingIds } = useBookmarkStore()
  const isSelected = selectedIds.has(bookmark.id)
  const isDeleting = deletingIds.has(bookmark.id)
  const [hovered, setHovered] = useState(false)

  const overId = useDndStore((s) => s.overId)
  const dropPosition = useDndStore((s) => s.dropPosition)
  const dndSource = useDndStore((s) => s.source)
  const isOver = overId === `droppable:bookmark:${bookmark.id}`
  const isOverInside = isOver && dropPosition === 'inside' && dndSource === 'main'

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `bookmark:${bookmark.id}`,
    data: { kind: 'bookmark', bookmark },
  })

  return (
    <div
      ref={setNodeRef}
      data-context="bookmark"
      data-id={bookmark.id}
      className="flex items-center mx-1 px-2 rounded select-none cursor-default"
      style={{
        height: isDeleting ? 0 : 32,
        opacity: isDeleting ? 0 : isDragging ? 0.3 : 1,
        marginTop: isDeleting ? 0 : undefined,
        marginBottom: isDeleting ? 0 : undefined,
        paddingTop: isDeleting ? 0 : undefined,
        paddingBottom: isDeleting ? 0 : undefined,
        overflow: 'hidden',
        transition: isDeleting ? 'opacity 0.2s ease-out, height 0.2s ease-out 0.05s, margin 0.2s ease-out 0.05s, padding 0.2s ease-out 0.05s' : 'none',
        background: isOverInside
          ? '#E5F0FF'
          : isSelected
            ? '#E5F0FF'
            : hovered
              ? '#F5F5F5'
              : 'transparent',
        outline: isOverInside ? '1px solid #0078D4' : undefined,
        outlineOffset: -1,
        touchAction: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => window.open(bookmark.url, '_blank')}
      {...listeners}
      {...attributes}
    >
      <div
        className="flex-shrink-0 mr-2.5 flex items-center justify-center cursor-default"
        style={{
          width: 18, height: 18,
          borderRadius: '50%',
          border: isSelected ? '2px solid #0078D4' : '2px solid #c0c0c0',
          background: isSelected ? '#0078D4' : 'transparent',
        }}
        onClick={(e) => { e.stopPropagation(); toggleSelect(bookmark.id) }}
      >
        {isSelected && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <div
        className="flex-shrink-0 mr-2 rounded-sm flex items-center justify-center text-[9px] text-[#666]"
        style={{ width: 16, height: 16, background: '#e8e8e8' }}
      >
        {bookmark.title.charAt(0)}
      </div>
      <span className="flex-1 truncate text-[13px] text-[#1a1a1a]">{bookmark.title}</span>
      <span className="flex-shrink-0 truncate text-xs text-[#888] mr-8" style={{ width: 320 }}>
        {bookmark.url}
      </span>
      <span className="flex-shrink-0 text-xs text-[#888]" style={{ width: 100, minWidth: 100 }}>
        {bookmark.created_at.slice(0, 10)}
      </span>
      <div
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded cursor-default"
        style={{ opacity: hovered ? 1 : 0.35, color: hovered ? '#cc3333' : '#999' }}
        onClick={(e) => { e.stopPropagation(); deleteOne(bookmark.id) }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
    </div>
  )
})

BookmarkRow.displayName = 'BookmarkRow'
export default BookmarkRow
