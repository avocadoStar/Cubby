import { memo, useRef, useEffect, useState } from 'react'
import type { Folder } from '../types'
import { useFolderStore } from '../stores/folderStore'
import { useDndStore } from '../stores/dndStore'
import { useDraggable } from '@dnd-kit/core'
import { ChevronRight, ChevronDown } from 'lucide-react'

const FolderNode = memo(({ node, depth }: { node: Folder; depth: number }) => {
  const { expandedIds, selectedId, toggleExpand, select } = useFolderStore()
  const overId = useDndStore((s) => s.overId)
  const dropPosition = useDndStore((s) => s.dropPosition)

  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const hasChildren = node.has_children
  const [hovered, setHovered] = useState(false)

  const isOver = overId === `droppable:sidebar:${node.id}`
  const isInside = isOver && dropPosition === 'inside'

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `sidebar:${node.id}`,
    data: { node, depth },
  })

  // Hover expand: start 500ms timer when pointer enters 'inside', cancel when it leaves.
  const expandTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (isOver && dropPosition === 'inside' && !isExpanded && hasChildren) {
      if (expandTimerRef.current === null) {
        expandTimerRef.current = window.setTimeout(() => {
          toggleExpand(node.id)
          expandTimerRef.current = null
        }, 500)
      }
    } else {
      if (expandTimerRef.current !== null) {
        clearTimeout(expandTimerRef.current)
        expandTimerRef.current = null
      }
    }
  }, [isOver, dropPosition, isExpanded, hasChildren, node.id, toggleExpand])

  useEffect(() => () => {
    if (expandTimerRef.current !== null) {
      clearTimeout(expandTimerRef.current)
      expandTimerRef.current = null
    }
  }, [])

  return (
    <div
      ref={setNodeRef}
      data-context="folder"
      data-id={node.id}
      className="flex items-center cursor-default rounded select-none"
      style={{
        height: 32,
        paddingLeft: 8 + depth * 20,
        paddingRight: 8,
        margin: '0 4px',
        opacity: isDragging ? 0.3 : 1,
        background: isInside
          ? '#E5F0FF'
          : isSelected
            ? '#E5F0FF'
            : hovered
              ? '#F5F5F5'
              : 'transparent',
        outline: isInside ? '1px solid #0078D4' : undefined,
        outlineOffset: -1,
        touchAction: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => select(node.id)}
      {...listeners}
      {...attributes}
    >
      <span
        className="flex-shrink-0 flex items-center justify-center"
        style={{ width: 16, height: 16 }}
        onClick={(e) => {
          e.stopPropagation()
          toggleExpand(node.id)
        }}
      >
        {hasChildren &&
          (isExpanded ? (
            <ChevronDown size={12} stroke="#666" strokeWidth={2} />
          ) : (
            <ChevronRight size={12} stroke="#666" strokeWidth={2} />
          ))}
      </span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="#F0C54F"
        stroke="#D4A830"
        strokeWidth="0.6"
        className="flex-shrink-0 ml-1"
      >
        <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
      <span className="ml-2 truncate text-body text-[#1a1a1a]">{node.name}</span>
    </div>
  )
})

FolderNode.displayName = 'FolderNode'
export default FolderNode
