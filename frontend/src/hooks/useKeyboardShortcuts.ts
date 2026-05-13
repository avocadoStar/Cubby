import { useEffect } from 'react'
import { useSelectionStore } from '../stores/selectionStore'
import type { Bookmark } from '../types'

export function useKeyboardShortcuts(bookmarks: Bookmark[], subFolderIds: string[]) {
  const selectAll = useSelectionStore(s => s.selectAll)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        selectAll(bookmarks, subFolderIds)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectAll, subFolderIds, bookmarks])
}
