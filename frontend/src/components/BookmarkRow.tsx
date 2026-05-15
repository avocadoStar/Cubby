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
      data-deleting={isDeleting ? 'true' : undefined}
      data-selected={isSelected ? 'true' : undefined}
      data-dragging={isDragging ? 'true' : undefined}
      className="bookmark-delete-motion neumorphic-row flex items-center px-2 h-[38px] overflow-hidden rounded-card mx-[45px] mb-[var(--card-gap)] touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-[var(--app-accent)] select-none cursor-pointer"
      style={{
        opacity: isDeleting ? 0 : isDragging ? 0.3 : 1,
        transform: isDeleting ? 'translateX(10px) scale(0.985)' : 'translateX(0) scale(1)',
        border: highlight ? 'var(--card-border-hover)' : 'var(--card-border)',
        boxShadow: isSelected || isOverInside ? 'var(--input-shadow)' : hovered ? 'var(--card-shadow-hover)' : 'var(--row-shadow)',
        transition: 'opacity 0.22s ease-out, transform 0.22s ease-out, background 0.2s ease, border-color 0.15s, box-shadow 0.15s',
        background: isOverInside ? 'var(--accent-light)'
          : isSelected ? 'var(--accent-light)'
          : isRecentlyChanged ? 'var(--accent-light)'
          : hovered ? 'var(--app-hover)'
          : 'var(--app-card)',
        outline: isOverInside ? '1px solid var(--app-accent)' : undefined,
        pointerEvents: isDeleting ? 'none' : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => openExternalURL(bookmark.url)}
      {...listeners}
      {...attributes}
      tabIndex={0}
    >
      <RowCheckbox checked={isSelected} ariaLabel={t('bookmark.selectAria')} onToggle={() => toggleSelect(bookmark.id)} />
      <div
        className="flex-shrink-0 mr-2 flex items-center justify-center text-small w-4 h-4 bg-[var(--row-icon-bg)] shadow-row-icon rounded-row-icon text-app-text2 overflow-hidden"
      >
        {bookmark.icon ? (
          <img
            src={bookmark.icon}
            alt=""
            aria-hidden="true"
            className="block w-4 h-4 object-contain"
          />
        ) : (
          bookmark.title.charAt(0)
        )}
      </div>
      <span className="flex-1 truncate text-body text-app-text">{bookmark.title}</span>
      <span className="flex-shrink-0 truncate text-xs mr-8 w-80 text-app-text2">
        {bookmark.url}
      </span>
      <span className="flex-shrink-0 text-xs w-[100px] min-w-[100px] text-app-text2">
        {bookmark.created_at.slice(0, 10)}
      </span>
      <RowDeleteButton hovered={hovered} ariaLabel={t('bookmark.deleteAria')} onDelete={() => deleteOne(bookmark.id)} />
      {onOpenNotes && (
        <>
          <div className="flex-shrink-0 w-px self-stretch mx-1.5" style={{ background: hovered ? 'var(--divider-color)' : 'transparent' }} />
          <button
            className="flex-shrink-0 flex items-center justify-center rounded cursor-pointer border-none w-[26px] h-[26px] bg-transparent text-[var(--fs--1)]"
            style={{
              opacity: hovered ? 1 : 0.35,
              color: bookmark.notes ? 'var(--app-accent)' : 'var(--app-text3)',
              fontWeight: bookmark.notes ? 700 : 400,
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
