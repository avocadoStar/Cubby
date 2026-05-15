import { useEffect } from 'react'
import { Folder as FolderIcon } from 'lucide-react'
import { useFolderStore } from '../../stores/folderStore'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useSearchStore } from '../../stores/searchStore'
import Spinner from '../Spinner'
import MobileBookmarkItem from './MobileBookmarkItem'
import SearchResults from '../SearchResults'
import { useListItems } from '../../hooks/useListItems'
import type { ListItem } from '../MainLayout'

interface MobileBookmarkListContentProps {
  items: ListItem[]
  loading: boolean
  deletingBookmarkIds?: Set<string>
  onSelectFolder: (id: string) => void | Promise<void>
  onOpenNotes: (id: string) => void
  onDeleteBookmark: (id: string) => void | Promise<void>
}

export function MobileBookmarkListContent({
  items,
  loading,
  deletingBookmarkIds = new Set(),
  onSelectFolder,
  onOpenNotes,
  onDeleteBookmark,
}: MobileBookmarkListContentProps) {
  return (
    <div className="flex-1 overflow-auto bg-app-bg relative" style={{ WebkitOverflowScrolling: 'touch' }}>
      {loading && items.length === 0 ? (
        <div className="flex justify-center items-center h-[200px] text-[var(--app-text3)] text-[14px]">加载中...</div>
      ) : (
        <>
          {items.map(item => {
            if (item.kind === 'folder') {
              return (
                <div key={item.folder.id} onClick={() => onSelectFolder(item.folder.id)} className="flex items-center gap-2 px-4 py-3 bg-app-card border-b border-divider cursor-pointer">
                  <div className="w-[18px] h-[18px] rounded-[var(--radius-xs)] shrink-0 flex items-center justify-center text-app-accent">
                    <FolderIcon size={18} strokeWidth={1.8} />
                  </div>
                  <span className="flex-1 text-[14px] font-medium text-app-text">{item.folder.name}</span>
                  <span className="text-[var(--app-text3)] text-[14px]">›</span>
                </div>
              )
            }

            return (
              <MobileBookmarkItem
                key={item.bookmark.id}
                bookmark={item.bookmark}
                isDeleting={deletingBookmarkIds.has(item.bookmark.id)}
                onOpenNotes={() => onOpenNotes(item.bookmark.id)}
                onDelete={() => onDeleteBookmark(item.bookmark.id)}
              />
            )
          })}

          {items.length === 0 && (
            <div className="flex justify-center items-center h-[200px] text-[var(--app-text3)] text-[14px]">暂无书签</div>
          )}
        </>
      )}
      {loading && items.length > 0 && (
        <div
          aria-label="加载中"
          className="absolute inset-0 flex justify-start items-center pt-3 bg-white/24 backdrop-blur-[1px] pointer-events-none"
        >
          <div className="inline-flex items-center gap-2 h-[30px] px-3 rounded-[var(--radius-pill)] border border-input-border bg-app-card text-app-text2 shadow-app-lg text-[13px]">
            <Spinner size="sm" />
            <span>加载中...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MobileBookmarkList({ onOpenNotes }: { onOpenNotes: (id: string) => void }) {
  const { selectedId, select } = useFolderStore()
  const { query: searchQuery, results: searchResults } = useSearchStore()
  const isSearching = searchQuery !== ''
  const { items, load, loading } = useListItems(selectedId)
  const deletingBookmarkIds = useBookmarkStore(s => s.deletingIds)

  useEffect(() => { load(selectedId) }, [load, selectedId])

  if (isSearching) {
    return (
      <div className="flex-1 overflow-auto bg-app-bg">
        <SearchResults query={searchQuery} results={searchResults} />
      </div>
    )
  }

  return (
    <MobileBookmarkListContent
      items={items}
      loading={loading}
      deletingBookmarkIds={deletingBookmarkIds}
      onSelectFolder={select}
      onOpenNotes={onOpenNotes}
      onDeleteBookmark={(id) => useBookmarkStore.getState().deleteOne(id)}
    />
  )
}
