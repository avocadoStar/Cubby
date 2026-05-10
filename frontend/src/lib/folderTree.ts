import type { Folder } from '../types'

export function buildVisibleNodes(
  folderMap: Map<string, Folder>,
  childrenMap: Map<string | null, string[]>,
  expandedIds: Set<string>,
): { node: Folder; depth: number }[] {
  const result: { node: Folder; depth: number }[] = []
  function walk(parentId: string | null, depth: number) {
    const children = childrenMap.get(parentId) || []
    for (const id of children) {
      const node = folderMap.get(id)
      if (!node) continue
      result.push({ node, depth })
      if (expandedIds.has(id)) {
        walk(id, depth + 1)
      }
    }
  }
  walk(null, 0)
  return result
}

export function getAncestorChain(folderMap: Map<string, Folder>, id: string): string[] {
  const ancestors: string[] = []
  let current: string | null = id
  while (current) {
    const f = folderMap.get(current)
    if (!f || !f.parent_id) break
    ancestors.push(f.parent_id)
    current = f.parent_id
  }
  return ancestors
}

export function rebuildChildrenMapAfterMove(
  childrenMap: Map<string | null, string[]>,
  itemId: string,
  oldParentId: string | null,
  newParentId: string | null,
  prevId: string | null,
  nextId: string | null,
): Map<string | null, string[]> {
  const result = new Map(childrenMap)
  if (result.has(oldParentId)) {
    result.set(oldParentId, (result.get(oldParentId) ?? []).filter(id => id !== itemId))
  }
  if (result.has(newParentId)) {
    const siblings = (result.get(newParentId) ?? []).filter(id => id !== itemId)
    let insertAt = siblings.length
    if (prevId && siblings.includes(prevId)) {
      insertAt = siblings.indexOf(prevId) + 1
    } else if (nextId && siblings.includes(nextId)) {
      insertAt = siblings.indexOf(nextId)
    }
    const next = [...siblings]
    next.splice(insertAt, 0, itemId)
    result.set(newParentId, next)
  }
  return result
}
