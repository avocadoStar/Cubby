import { useCallback } from 'react'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useFolderStore } from '../stores/folderStore'
import { api } from '../services/api'

interface Target {
  id: string
  type: 'bookmark' | 'folder'
}

export function useContextActions(target: Target | null, closeMenu: () => void) {
  const getBookmark = useCallback(() => {
    const id = target?.id
    return id ? useBookmarkStore.getState().bookmarks.find(b => b.id === id) : undefined
  }, [target])

  const openUrl = useCallback((windowTarget: string, features?: string) => {
    const bm = getBookmark()
    if (bm) window.open(bm.url, windowTarget, features)
    closeMenu()
  }, [getBookmark, closeMenu])

  const handleCopyLink = useCallback(async () => {
    const bm = getBookmark()
    if (bm) {
      try {
        await navigator.clipboard.writeText(bm.url)
      } catch {
        const input = document.createElement('input')
        input.value = bm.url
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
    }
    closeMenu()
  }, [getBookmark, closeMenu])

  const handleDelete = useCallback(async () => {
    const id = target?.id
    if (!id) return
    const folderStore = useFolderStore.getState()
    if (target?.type === 'bookmark') {
      await api.deleteBookmark(id)
      useBookmarkStore.getState().load(folderStore.selectedId)
    } else {
      const folder = folderStore.folderMap.get(id)
      const parentId = folder?.parent_id ?? null
      await api.deleteFolder(id)
      await folderStore.loadChildren(parentId)
      await folderStore.loadChildren(null)
      if (folderStore.selectedId === id) {
        folderStore.select(parentId)
      }
    }
    closeMenu()
  }, [target, closeMenu])

  return { getBookmark, openUrl, handleCopyLink, handleDelete }
}
