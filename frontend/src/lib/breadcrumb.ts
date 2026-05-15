import type { Folder } from '../types'

export function buildBreadcrumbPath(selectedId: string | null, folderMap: Map<string, Folder>): { id: string | null; name: string }[] {
  const folderPath: { id: string; name: string }[] = []
  let current = selectedId
  while (current) {
    const folder = folderMap.get(current)
    if (!folder) break
    folderPath.push({ id: folder.id, name: folder.name })
    current = folder.parent_id
  }

  return [
    { id: null, name: '收藏夹' },
    ...folderPath.reverse(),
  ]
}
