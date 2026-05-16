import { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { Folder } from '../types'
import type { ListItem } from './MainLayout'
import { composeMainDroppableId, normalizeOverId } from '../lib/dndIds'

interface ItemDroppableProps {
  item: ListItem
  activeId: string | null
  folderMap: Map<string, Folder>
  style: React.CSSProperties
  children: React.ReactNode
}

export default function ItemDroppable({
  item,
  activeId,
  folderMap,
  style,
  children,
}: ItemDroppableProps) {
  const nodeId = item.kind === 'folder' ? item.folder.id : item.bookmark.id
  const dropId = composeMainDroppableId(nodeId)

  const disabled = useMemo(() => {
    if (!activeId || activeId === dropId) return false
    const activeFolderId = normalizeOverId(activeId)
    if (activeFolderId === nodeId) return true

    let current: string | null = nodeId
    while (current) {
      const f = folderMap.get(current)
      if (!f || !f.parent_id) break
      if (f.parent_id === activeFolderId) return true
      current = f.parent_id
    }
    return false
  }, [activeId, nodeId, dropId, folderMap])

  const { setNodeRef } = useDroppable({ id: dropId, data: { item }, disabled })

  return (
    <div ref={setNodeRef} data-drop-id={dropId} style={{ ...style, touchAction: 'none' }}>
      {children}
    </div>
  )
}
