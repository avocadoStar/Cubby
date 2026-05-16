import { useState, memo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useDndStore } from '../stores/dndStore'
import { composeMainDroppableId } from '../lib/dndIds'
import { ChevronRight } from 'lucide-react'
import type { Folder } from '../types'
import RowCheckbox from './RowCheckbox'
import RowDeleteButton from './RowDeleteButton'
import { t } from '../i18n'
import { getRowStyles } from '../lib/rowStyles'

interface FolderRowComponentProps {
  folder: Folder
  isFolderSelected: boolean
  onToggleSelect: () => void
  onNavigate: () => void
  isDragging: boolean
  isInside: boolean
  onDelete: () => void
}

const FolderRowComponent = memo(function FolderRowComponent({
  folder,
  isFolderSelected,
  onToggleSelect,
  onNavigate,
  isDragging,
  isInside,
  onDelete,
}: FolderRowComponentProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      data-context="folder"
      data-id={folder.id}
      data-selected={isFolderSelected ? 'true' : undefined}
      data-dragging={isDragging ? 'true' : undefined}
      className="neumorphic-row flex items-center px-2 h-[38px] rounded-card border-[var(--card-border)] mx-[45px] mb-[var(--card-gap)] touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-[var(--app-accent)] select-none cursor-pointer"
      style={getRowStyles({ isDragging, isSelected: isFolderSelected, isOverInside: isInside, hovered })}
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onNavigate}
    >
      <RowCheckbox checked={isFolderSelected} ariaLabel={t('folder.selectAria')} onToggle={onToggleSelect} />
      <div
        className="flex-shrink-0 mr-2 flex items-center justify-center w-4 h-4 rounded-row-icon bg-[var(--row-icon-bg)] shadow-row-icon"
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" className="fill-[var(--folder-icon-fill)] stroke-[var(--folder-icon-stroke)]" strokeWidth="0.6">
          <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
        </svg>
      </div>
      <span className="flex-1 truncate text-body text-app-text">{folder.name}</span>
      <span className="flex-shrink-0 truncate text-xs mr-8 w-80 text-app-text2">{t('folder.label')}</span>
      <span className="flex-shrink-0 text-xs w-[100px] min-w-[100px] text-app-text2" />
      <RowDeleteButton hovered={hovered} ariaLabel={t('folder.deleteAria')} onDelete={onDelete} />
      <div
        className="flex-shrink-0 w-px self-stretch mx-1.5"
        style={{ background: hovered ? 'var(--divider-color)' : 'transparent' }}
      />
      <span className="flex-shrink-0 flex items-center justify-center w-[26px]">
        <ChevronRight size={14} color="var(--app-text3)" strokeWidth={1.5} />
      </span>
    </div>
  )
})

interface DraggableFolderRowProps {
  folder: Folder
  isFolderSelected: boolean
  onToggleSelect: () => void
  onNavigate: () => void
  onDelete: () => void
}

export default function DraggableFolderRow({
  folder,
  isFolderSelected,
  onToggleSelect,
  onNavigate,
  onDelete,
}: DraggableFolderRowProps) {
  const overId = useDndStore((s) => s.overId)
  const dropPosition = useDndStore((s) => s.dropPosition)
  const dndSource = useDndStore((s) => s.source)
  const isOver = overId === composeMainDroppableId(folder.id)
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
        onDelete={onDelete}
      />
    </div>
  )
}
