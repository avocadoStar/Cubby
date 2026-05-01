import Sidebar from './Sidebar'
import Toolbar from './Toolbar'
import BookmarkRow from './BookmarkRow'
import BatchActionBar from './BatchActionBar'
import ContextMenu from './ContextMenu'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useFolderStore } from '../stores/folderStore'
import { useEffect, useMemo } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useState } from 'react'
import type { Folder } from '../types'
import { ChevronRight } from 'lucide-react'

type ListItem =
  | { kind: 'folder'; folder: Folder }
  | { kind: 'bookmark'; bookmark: import('../types').Bookmark }

export default function MainLayout() {
  const { bookmarks, load, selectAll } = useBookmarkStore()
  const { selectedId, childrenMap, folderMap, select } = useFolderStore()
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set())

  useEffect(() => { load(null) }, [])

  useEffect(() => { load(selectedId); setSelectedFolderIds(new Set()) }, [selectedId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        selectAll()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectAll])

  // Build combined list: sub-folders first, then bookmarks
  const items: ListItem[] = useMemo(() => {
    const result: ListItem[] = []
    // Sub-folders
    const subFolderIds = childrenMap.get(selectedId) || []
    for (const id of subFolderIds) {
      const f = folderMap.get(id)
      if (f) result.push({ kind: 'folder', folder: f })
    }
    // Bookmarks
    for (const b of bookmarks) {
      result.push({ kind: 'bookmark', bookmark: b })
    }
    return result
  }, [selectedId, childrenMap, folderMap, bookmarks])

  return (
    <div className="flex h-screen bg-white relative">
      <ContextMenu />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Toolbar />
        <BatchActionBar />
        <div className="flex-1">
          <Virtuoso
            totalCount={items.length}
            itemContent={(i) => {
              const item = items[i]
              if (item.kind === 'folder') {
                const isFolderSelected = selectedFolderIds.has(item.folder.id)
                return (
                  <div
                    data-context="folder"
                    data-id={item.folder.id}
                    className="flex items-center mx-1 px-2 rounded select-none cursor-default"
                    style={{ height: 32, background: isFolderSelected ? '#E5F0FF' : 'transparent' }}
                    onClick={() => select(item.folder.id)}
                  >
                    <div
                      className="flex-shrink-0 mr-2.5 flex items-center justify-center cursor-default"
                      style={{
                        width: 18, height: 18,
                        borderRadius: '50%',
                        border: isFolderSelected ? '2px solid #0078D4' : '2px solid #c0c0c0',
                        background: isFolderSelected ? '#0078D4' : 'transparent',
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFolderIds(prev => {
                          const next = new Set(prev)
                          if (next.has(item.folder.id)) { next.delete(item.folder.id) }
                          else { next.add(item.folder.id) }
                          return next
                        })
                      }}
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
                    <span className="flex-1 truncate text-[13px] text-[#1a1a1a]">{item.folder.name}</span>
                    <span className="flex-shrink-0 text-xs text-[#888] mr-8" style={{ width: 320 }}>文件夹</span>
                    <span className="flex-shrink-0 text-xs text-[#888]" style={{ width: 100, minWidth: 100 }} />
                    <ChevronRight size={14} stroke="#999" strokeWidth={1.5} className="flex-shrink-0" />
                  </div>
                )
              }
              return <BookmarkRow bookmark={item.bookmark} />
            }}
          />
        </div>
      </div>
    </div>
  )
}
