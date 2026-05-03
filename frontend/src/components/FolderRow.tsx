import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useDndStore } from '../stores/dndStore'
import { ChevronRight } from 'lucide-react'
import type { Folder } from '../types'

interface FolderRowComponentProps {
  folder: Folder
  isFolderSelected: boolean
  onToggleSelect: () => void
  onNavigate: () => void
  isDragging: boolean
  isInside: boolean
  onDelete: () => void
}

function FolderRowComponent({
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
      className="flex items-center px-2 select-none cursor-default"
      style={{
        height: 38, borderRadius: 8,
        border: '1px solid var(--app-border, #E0E0E0)',
        margin: '0 45px 8px 45px',
        opacity: isDragging ? 0.3 : 1,
        background: isInside ? 'var(--accent-light, #E5F0FF)' : isFolderSelected ? 'var(--accent-light, #E5F0FF)' : hovered ? 'var(--app-hover, #F5F5F5)' : 'var(--app-card, #FFFFFF)',
        outline: isInside ? '1px solid var(--app-accent, #0078D4)' : undefined,
        outlineOffset: -1,
        touchAction: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onNavigate}
    >
      <div
        className="flex-shrink-0 mr-2.5 flex items-center justify-center cursor-default"
        style={{
          width: 18, height: 18,
          borderRadius: '50%',
          border: isFolderSelected ? '2px solid #0078D4' : '2px solid #c0c0c0',
          background: isFolderSelected ? '#0078D4' : 'transparent',
        }}
        onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
      >
        {isFolderSelected && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#F0C54F" stroke="#D4A830" strokeWidth="0.6" className="flex-shrink-0 mr-2">
        <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
      </svg>
      <span className="flex-1 truncate text-body text-[#1a1a1a]">{folder.name}</span>
      <span className="flex-shrink-0 text-xs text-[#888] mr-8" style={{ width: 320 }}>文件夹</span>
      <span className="flex-shrink-0 text-xs text-[#888]" style={{ width: 100, minWidth: 100 }} />
      <div
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded cursor-default"
        style={{ opacity: hovered ? 1 : 0.35, color: hovered ? '#cc3333' : '#999' }}
        onClick={(e) => { e.stopPropagation(); onDelete() }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
      <div
        className="flex-shrink-0"
        style={{ width: 1, alignSelf: 'stretch', background: hovered ? '#e0e0e0' : 'transparent', margin: '0 6px' }}
      />
      <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 26 }}>
        <ChevronRight size={14} stroke="#999" strokeWidth={1.5} />
      </span>
    </div>
  )
}

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
  const isOver = overId === `droppable:${folder.id}`
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
