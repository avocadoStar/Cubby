import type { Folder } from '../types'
import { rebuildChildrenMapAfterMove } from '../lib/folderTree'

export interface FolderMaps {
  folderMap: Map<string, Folder>
  childrenMap: Map<string | null, string[]>
}

export function sortFolderIdsBySortKey(ids: string[], folderMap: Map<string, Folder>): string[] {
  return [...ids].sort((a, b) => {
    const af = folderMap.get(a)
    const bf = folderMap.get(b)
    if (!af || !bf) return a.localeCompare(b)
    if (af.sort_key < bf.sort_key) return -1
    if (af.sort_key > bf.sort_key) return 1
    return af.id.localeCompare(bf.id)
  })
}

export function addCreatedFolderToMaps(
  folderMap: Map<string, Folder>,
  childrenMap: Map<string | null, string[]>,
  created: Folder,
  parentId: string | null,
): FolderMaps {
  const nextFolderMap = new Map(folderMap)
  const nextChildrenMap = new Map(childrenMap)
  nextFolderMap.set(created.id, created)

  const siblings = (nextChildrenMap.get(parentId) ?? []).filter((id) => id !== created.id)
  nextChildrenMap.set(parentId, sortFolderIdsBySortKey([...siblings, created.id], nextFolderMap))

  if (parentId !== null) {
    const parent = nextFolderMap.get(parentId)
    if (parent) {
      nextFolderMap.set(parentId, { ...parent, has_children: true })
    }
  }

  return { folderMap: nextFolderMap, childrenMap: nextChildrenMap }
}

export function removeFolderFromMaps(
  folderMap: Map<string, Folder>,
  childrenMap: Map<string | null, string[]>,
  id: string,
): FolderMaps {
  const nextFolderMap = new Map(folderMap)
  nextFolderMap.delete(id)
  const nextChildrenMap = new Map(childrenMap)
  for (const [pid, children] of nextChildrenMap) {
    nextChildrenMap.set(pid, children.filter((cid) => cid !== id))
  }
  return { folderMap: nextFolderMap, childrenMap: nextChildrenMap }
}

export function setFolderInMap(folderMap: Map<string, Folder>, folder: Folder): Map<string, Folder> {
  const nextFolderMap = new Map(folderMap)
  nextFolderMap.set(folder.id, folder)
  return nextFolderMap
}

export function applyOptimisticFolderMoveToMaps(
  folderMap: Map<string, Folder>,
  childrenMap: Map<string | null, string[]>,
  folder: Folder,
  newParentId: string | null,
  prevId: string | null,
  nextId: string | null,
  sortKey: string,
  version: number,
): FolderMaps {
  const nextFolderMap = new Map(folderMap)
  const nextChildrenMap = rebuildChildrenMapAfterMove(
    childrenMap,
    folder.id,
    folder.parent_id ?? null,
    newParentId,
    prevId,
    nextId,
  )
  nextFolderMap.set(folder.id, { ...folder, parent_id: newParentId, sort_key: sortKey, version })

  const oldParentId = folder.parent_id ?? null
  if (oldParentId !== null) {
    const oldParent = nextFolderMap.get(oldParentId)
    if (oldParent && nextChildrenMap.has(oldParentId)) {
      nextFolderMap.set(oldParentId, { ...oldParent, has_children: (nextChildrenMap.get(oldParentId) ?? []).length > 0 })
    }
  }
  if (newParentId !== null) {
    const newParent = nextFolderMap.get(newParentId)
    if (newParent) {
      nextFolderMap.set(newParentId, { ...newParent, has_children: true })
    }
  }

  return { folderMap: nextFolderMap, childrenMap: nextChildrenMap }
}
