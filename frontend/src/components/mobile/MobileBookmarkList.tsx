import { useEffect } from 'react'
import { Folder as FolderIcon } from 'lucide-react'
import { useFolderStore } from '../../stores/folderStore'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useSearchStore } from '../../stores/searchStore'
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
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--app-bg)', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
      {loading && items.length === 0 ? (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: 200, color: 'var(--app-text3)', fontSize: 14,
        }}>加载中...</div>
      ) : (
        <>
          {items.map(item => {
            if (item.kind === 'folder') {
              return (
                <div key={item.folder.id} onClick={() => onSelectFolder(item.folder.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 16px', background: 'var(--app-card)',
                  borderBottom: '1px solid var(--divider-color)', cursor: 'pointer',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 'var(--radius-xs)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--app-accent)',
                  }}>
                    <FolderIcon size={18} strokeWidth={1.8} />
                  </div>
                  <span style={{
                    flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--app-text)',
                  }}>{item.folder.name}</span>
                  <span style={{ color: 'var(--app-text3)', fontSize: 14 }}>›</span>
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
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              height: 200, color: 'var(--app-text3)', fontSize: 14,
            }}>暂无书签</div>
          )}
        </>
      )}
      {loading && items.length > 0 && (
        <div
          aria-label="加载中"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: 12,
            background: 'rgba(255, 255, 255, 0.24)',
            backdropFilter: 'blur(1px)',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            height: 30,
            padding: '0 12px',
            borderRadius: 'var(--radius-pill)',
            border: 'var(--input-border)',
            background: 'var(--app-card)',
            color: 'var(--app-text2)',
            boxShadow: 'var(--shadow-lg)',
            fontSize: 13,
          }}>
            <span className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--app-accent)', borderTopColor: 'transparent' }} />
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
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--app-bg)' }}>
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
