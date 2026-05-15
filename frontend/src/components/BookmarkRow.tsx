import { memo, useState } from 'react'
import type { Bookmark } from '../types'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useSelectionStore } from '../stores/selectionStore'
import { useDndStore } from '../stores/dndStore'
import { useDraggable } from '@dnd-kit/core'
import RowCheckbox from './RowCheckbox'
import RowDeleteButton from './RowDeleteButton'
import { t } from '../i18n'

function openExternalURL(url: string) {
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (opened) opened.opener = null
}

const BookmarkRow = memo(({ bookmark, onOpenNotes }: { bookmark: Bookmark; onOpenNotes?: () => void }) => {
  const isSelected = useSelectionStore(s => s.selectedIds.has(bookmark.id))
  const isDeleting = useBookmarkStore(s => s.deletingIds.has(bookmark.id))
  const isRecentlyChanged = useBookmarkStore(s => s.recentlyChangedIds.has(bookmark.id))
  const toggleSelect = useSelectionStore(s => s.toggleSelect)
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
        transition: isDeleting ? 'opacity 0.2s ease-out, height 0.2s ease-out, margin 0.2s ease-out' : 'background 0.2s ease, border-color 0.15s, box-shadow 0.15s',
        background: isOverInside ? 'var(--accent-light)'
          : isSelected ? 'var(--accent-light)'
          : isRecentlyChanged ? 'var(--accent-light)'
          : hovered ? 'var(--app-hover)'
          : 'var(--app-card)',
        outline: isOverInside ? '1px solid var(--app-accent)' : undefined,
        outlineOffset: -1,
        touchAction: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => openExternalURL(bookmark.url)}
      {...listeners}
      {...attributes}
    >
      <RowCheckbox checked={isSelected} ariaLabel={t('bookmark.selectAria')} onToggle={() => toggleSelect(bookmark.id)} />
      <div
        className="flex-shrink-0 mr-2 rounded-sm flex items-center justify-center text-small"
        style={{
          width: 16, height: 16,
          background: 'var(--row-icon-bg)',
          boxShadow: 'var(--row-icon-shadow)',
          borderRadius: 'var(--row-icon-radius)',
          color: 'var(--app-text2)',
          overflow: 'hidden',
        }}
      >
        {bookmark.icon ? (
          <img
            src={bookmark.icon}
            alt=""
            aria-hidden="true"
            style={{ width: 16, height: 16, display: 'block', objectFit: 'contain' }}
          />
        ) : (
          bookmark.title.charAt(0)
        )}
      </div>
      <span className="flex-1 truncate text-body" style={{ color: 'var(--app-text)' }}>{bookmark.title}</span>
      <span className="flex-shrink-0 truncate text-xs mr-8" style={{ width: 320, color: 'var(--app-text2)' }}>
        {bookmark.url}
      </span>
      <span className="flex-shrink-0 text-xs" style={{ width: 100, minWidth: 100, color: 'var(--app-text2)' }}>
        {bookmark.created_at.slice(0, 10)}
      </span>
      <RowDeleteButton hovered={hovered} ariaLabel={t('bookmark.deleteAria')} onDelete={() => deleteOne(bookmark.id)} />
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
