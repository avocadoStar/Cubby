import { memo, useState } from 'react'
import type { Bookmark } from '../types'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useDndStore } from '../stores/dndStore'
import { useDraggable } from '@dnd-kit/core'

const BookmarkRow = memo(({ bookmark, onOpenNotes }: { bookmark: Bookmark; onOpenNotes?: () => void }) => {
  const isSelected = useBookmarkStore(s => s.selectedIds.has(bookmark.id))
  const isDeleting = useBookmarkStore(s => s.deletingIds.has(bookmark.id))
  const toggleSelect = useBookmarkStore(s => s.toggleSelect)
  const deleteOne = useBookmarkStore(s => s.deleteOne)
  const [hovered, setHovered] = useState(false)

  const overId = useDndStore((s) => s.overId)
  const dropPosition = useDndStore((s) => s.dropPosition)
  const dndSource = useDndStore((s) => s.source)
  const isOver = overId === `droppable:bookmark:${bookmark.id}`
  const isOverInside = isOver && dropPosition === 'inside' && dndSource === 'main'

  const highlight = hovered && !isOverInside && !isSelected

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
      className="flex items-center px-2 rounded select-none cursor-default"
      style={{
        height: isDeleting ? 0 : 38,
        opacity: isDeleting ? 0 : isDragging ? 0.3 : 1,
        marginBottom: isDeleting ? 0 : 'var(--card-gap)',
        marginLeft: 45, marginRight: 45,
        overflow: 'hidden',
        borderRadius: 'var(--card-radius)',
        border: highlight ? 'var(--card-border-hover)' : 'var(--card-border)',
        boxShadow: isSelected || isOverInside ? 'var(--input-shadow)' : hovered ? 'var(--card-shadow-hover)' : 'var(--row-shadow)',
        transition: isDeleting ? 'opacity 0.2s ease-out, height 0.2s ease-out, margin 0.2s ease-out' : 'border-color 0.15s, box-shadow 0.15s',
        background: isOverInside ? 'var(--accent-light)'
          : isSelected ? 'var(--accent-light)'
          : hovered ? 'var(--app-hover)'
          : 'var(--app-card)',
        outline: isOverInside ? '1px solid var(--app-accent)' : undefined,
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
        role="checkbox"
        aria-checked={isSelected}
        aria-label="选择收藏夹"
        className="flex-shrink-0 mr-2.5 flex items-center justify-center cursor-default"
        style={{
          width: 18, height: 18,
          borderRadius: '50%',
          border: isSelected ? '2px solid var(--app-accent)' : 'var(--checkbox-border)',
          background: isSelected ? 'var(--app-accent)' : 'transparent',
        }}
        onClick={(e) => { e.stopPropagation(); toggleSelect(bookmark.id) }}
      >
        {isSelected && (
          <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-on-accent)" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <div
        className="flex-shrink-0 mr-2 rounded-sm flex items-center justify-center text-small"
        style={{
          width: 16, height: 16,
          background: 'var(--row-icon-bg)',
          boxShadow: 'var(--row-icon-shadow)',
          borderRadius: 'var(--row-icon-radius)',
          color: 'var(--app-text2)',
        }}
      >
        {bookmark.title.charAt(0)}
      </div>
      <span className="flex-1 truncate text-body" style={{ color: 'var(--app-text)' }}>{bookmark.title}</span>
      <span className="flex-shrink-0 truncate text-xs mr-8" style={{ width: 320, color: 'var(--app-text2)' }}>
        {bookmark.url}
      </span>
      <span className="flex-shrink-0 text-xs" style={{ width: 100, minWidth: 100, color: 'var(--app-text2)' }}>
        {bookmark.created_at.slice(0, 10)}
      </span>
      <div
        role="button"
        aria-label="删除收藏夹"
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded cursor-default"
        style={{ opacity: hovered ? 1 : 0.35, color: hovered ? 'var(--app-danger)' : 'var(--app-text3)' }}
        onClick={(e) => { e.stopPropagation(); deleteOne(bookmark.id) }}
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
      {onOpenNotes && (
        <>
          <div className="flex-shrink-0" style={{ width: 1, alignSelf: 'stretch', background: hovered ? 'var(--divider-color)' : 'transparent', margin: '0 6px' }} />
          <button
            className="flex-shrink-0 flex items-center justify-center rounded cursor-default border-none"
            style={{
              width: 26, height: 26, opacity: hovered ? 1 : 0.35,
              color: bookmark.notes ? 'var(--app-accent)' : 'var(--app-text3)',
              fontWeight: bookmark.notes ? 700 : 400, background: 'transparent', fontSize: 'var(--fs--1)',
            }}
            onClick={(e) => { e.stopPropagation(); onOpenNotes() }}
          >N</button>
        </>
      )}
    </div>
  )
})

BookmarkRow.displayName = 'BookmarkRow'
export default BookmarkRow
