import { useMemo } from 'react'
import { useFolderStore } from '../stores/folderStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import type { ListItem } from '../components/MainLayout'
import type { UnifiedSortableItem } from '../lib/dndUtils'

export function useListItems(selectedId: string | null) {
  const { bookmarks, load, loading } = useBookmarkStore()
  const { childrenMap, folderMap } = useFolderStore()

  const subFolderIds = useMemo(() => {
    return (childrenMap.get(selectedId) || []).filter((id) => folderMap.has(id))
  }, [selectedId, childrenMap, folderMap])

  const items: ListItem[] = useMemo(() => {
    const result: ListItem[] = []
    for (const id of subFolderIds) {
      const f = folderMap.get(id)
      if (f) result.push({ kind: 'folder', folder: f })
    }
    for (const b of bookmarks) {
      result.push({ kind: 'bookmark', bookmark: b })
    }
    const getKey = (i: ListItem) => i.kind === 'folder' ? i.folder.sort_key : i.bookmark.sort_key
    result.sort((a, b) => (getKey(a) < getKey(b) ? -1 : 1))
    return result
  }, [subFolderIds, folderMap, bookmarks])

  const renderedItems: UnifiedSortableItem[] = useMemo(() => {
    return items.map((item) => (
      item.kind === 'folder'
        ? { id: item.folder.id, parentId: item.folder.parent_id, sortKey: item.folder.sort_key }
        : { id: item.bookmark.id, parentId: item.bookmark.folder_id, sortKey: item.bookmark.sort_key }
    ))
  }, [items])

  return { items, renderedItems, subFolderIds, load, loading }
}
