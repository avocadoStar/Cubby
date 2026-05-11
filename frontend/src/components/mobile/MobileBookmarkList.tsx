import { useEffect, useMemo } from 'react'
import { useFolderStore } from '../../stores/folderStore'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useSearchStore } from '../../stores/searchStore'
import MobileBookmarkItem from './MobileBookmarkItem'
import SearchResults from '../SearchResults'

export default function MobileBookmarkList({ onOpenNotes }: { onOpenNotes: (id: string) => void }) {
  const { bookmarks, load, loading } = useBookmarkStore()
  const { selectedId, childrenMap, folderMap, select } = useFolderStore()
  const { query: searchQuery, results: searchResults } = useSearchStore()
  const isSearching = searchQuery !== ''

  useEffect(() => { load(selectedId) }, [load, selectedId])

  const subFolderIds = useMemo(() => {
    return (childrenMap.get(selectedId) || []).filter(id => folderMap.has(id))
  }, [selectedId, childrenMap, folderMap])

  const subFolders = useMemo(() => {
    return subFolderIds.map(id => folderMap.get(id)!).filter(Boolean)
  }, [subFolderIds, folderMap])

  if (isSearching) {
    return (
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--app-bg)' }}>
        <SearchResults query={searchQuery} results={searchResults} />
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--app-bg)', WebkitOverflowScrolling: 'touch' }}>
      {loading && bookmarks.length === 0 && subFolders.length === 0 ? (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: 200, color: 'var(--app-text3)', fontSize: 14,
        }}>加载中...</div>
      ) : (
        <>
          {/* Folders */}
          {subFolders.map(folder => (
            <div key={folder.id} onClick={() => select(folder.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 16px', background: 'var(--app-card)',
              borderBottom: '1px solid var(--divider-color)', cursor: 'pointer',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 3, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
              }}>📁</div>
              <span style={{
                flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--app-text)',
              }}>{folder.name}</span>
              <span style={{ color: 'var(--app-text3)', fontSize: 14 }}>›</span>
            </div>
          ))}

          {/* Divider */}
          {subFolders.length > 0 && bookmarks.length > 0 && (
            <div style={{ height: 1, background: 'var(--app-border)', margin: '0 16px' }} />
          )}

          {/* Bookmarks */}
          {bookmarks.map(bookmark => (
            <MobileBookmarkItem
              key={bookmark.id}
              bookmark={bookmark}
              onOpenNotes={() => onOpenNotes(bookmark.id)}
              onDelete={async () => {
                await useBookmarkStore.getState().deleteOne(bookmark.id)
              }}
            />
          ))}

          {bookmarks.length === 0 && subFolders.length === 0 && (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              height: 200, color: 'var(--app-text3)', fontSize: 14,
            }}>暂无书签</div>
          )}
        </>
      )}
    </div>
  )
}
