import Sidebar from './Sidebar'
import Toolbar from './Toolbar'
import BookmarkRow from './BookmarkRow'
import ToastContainer from './Toast'
import { useSearchStore } from '../stores/searchStore'
import BatchActionBar from './BatchActionBar'
import ContextMenu from './ContextMenu'
import DropIndicator from './DropIndicator'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useSelectionStore } from '../stores/selectionStore'
import { useFolderStore } from '../stores/folderStore'
import { useDndStore } from '../stores/dndStore'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  DndContext,
  DragOverlay,
  getClientRect,
  type Modifier,
} from '@dnd-kit/core'
import { pointerClosestCenter, type UnifiedSortableItem } from '../lib/dndUtils'
import type { Folder, Bookmark } from '../types'
import { useDragAndDrop } from '../hooks/useDragAndDrop'

export type ListItem =
  | { kind: 'folder'; folder: Folder }
  | { kind: 'bookmark'; bookmark: Bookmark }

import ItemDroppable from './ItemDroppable'
import DraggableFolderRow from './FolderRow'
import SearchResults from './SearchResults'
import NotesPanel from './NotesPanel'

export default function MainLayout() {
  const { bookmarks, load, loading } = useBookmarkStore()
  const { selectAll, selectedFolderIds, toggleFolderSelect } = useSelectionStore()
  const { selectedId, childrenMap, folderMap, select } = useFolderStore()
  const { activeItem, activeId } = useDndStore()
  const { query: searchQuery, results: searchResults } = useSearchStore()
  const isSearching = searchQuery !== ''
  const [notesBookmarkId, setNotesBookmarkId] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load(selectedId)
  }, [load, selectedId])

  const subFolderIds = useMemo(() => {
    return (childrenMap.get(selectedId) || []).filter((id) => folderMap.has(id))
  }, [selectedId, childrenMap, folderMap])

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
  }, [selectAll, subFolderIds])

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

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 46,
    overscan: 10,
  })

  const { sensors, handleDragStart, handleDragMove, handleDragEnd, handleDragCancel, multiDragRef } =
    useDragAndDrop(items, renderedItems, selectedId)

  const dragOverlayTopLeftModifier: Modifier = ({ transform, overlayNodeRect }) => ({
    ...transform,
    x: transform.x + ((overlayNodeRect?.width ?? 0) / 2) - 10,
    y: transform.y + ((overlayNodeRect?.height ?? 0) / 2) - 10,
  })

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={pointerClosestCenter}
      measuring={{ droppable: { measure: getClientRect } }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-screen relative" style={{ background: 'var(--app-bg)' }}>
        <ContextMenu />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Toolbar />
          <BatchActionBar />
          {isSearching ? (
            <SearchResults query={searchQuery} results={searchResults} />
          ) : (
          <>
          <div className="flex-1" ref={scrollRef} style={{ overflow: 'auto' }}>
            {loading && items.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: 'var(--app-text3)', fontSize: 'var(--fs--1)' }}>
                加载中...
              </div>
            ) : (
            <div style={{ height: rowVirtualizer.getTotalSize() + 8, position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((vi) => {
                const item = items[vi.index]
                const wrapperStyle: React.CSSProperties = {
                  position: 'absolute',
                  top: 8,
                  left: 0,
                  width: '100%',
                  height: vi.size,
                  transform: `translateY(${vi.start}px)`,
                }

                if (item.kind === 'folder') {
                  return (
                    <ItemDroppable
                      key={item.folder.id}
                      item={item}
                      activeId={activeId}
                      folderMap={folderMap}
                      style={wrapperStyle}
                    >
                      <DraggableFolderRow
                        folder={item.folder}
                        isFolderSelected={selectedFolderIds.has(item.folder.id)}
                        onToggleSelect={() => toggleFolderSelect(item.folder.id)}
                        onNavigate={() => select(item.folder.id)}
                        onDelete={() => useFolderStore.getState().deleteOne(item.folder.id)}
                      />
                    </ItemDroppable>
                  )
                }
                return (
                  <ItemDroppable
                    key={item.bookmark.id}
                    item={item}
                    activeId={activeId}
                    folderMap={folderMap}
                    style={wrapperStyle}
                  >
                    <BookmarkRow bookmark={item.bookmark} onOpenNotes={() => setNotesBookmarkId(prev => prev === item.bookmark.id ? null : item.bookmark.id)} />
                  </ItemDroppable>
                )
              })}
            </div>
            )}
          </div>
          </>
          )}
        </div>
        <NotesPanel bookmark={notesBookmarkId ? bookmarks.find(b => b.id === notesBookmarkId) ?? null : null} onClose={() => setNotesBookmarkId(null)} />
      </div>

      <DragOverlay dropAnimation={null} modifiers={[dragOverlayTopLeftModifier]}>
        {activeItem && (
          <div
            className="flex items-center rounded select-none"
            style={{
              height: 32,
              maxWidth: 200,
              paddingLeft: 8,
              paddingRight: 8,
              opacity: 0.85,
              background: 'var(--app-card)',
              boxShadow: 'var(--shadow-lg)',
              borderRadius: 'var(--card-radius)',
              transform: 'scale(1.02)',
            }}
          >
            {activeItem.kind === 'bookmark' ? (
              <div className="flex-shrink-0 rounded-sm flex items-center justify-center text-small"
                style={{ width: 16, height: 16, background: 'var(--app-hover)', color: 'var(--app-text2)' }}>
                {(activeItem.title).charAt(0)}
              </div>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--folder-icon-fill)" stroke="var(--folder-icon-stroke)" strokeWidth="0.6">
                <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            )}
            <span className="ml-2 truncate text-body" style={{ color: 'var(--app-text)' }}>
              {activeItem.title}
            </span>
            {multiDragRef.current.length > 1 && (
              <span className="ml-2 flex-shrink-0 rounded-full text-caption px-1.5 py-0.5 leading-none"
                style={{ minWidth: 18, textAlign: 'center', background: 'var(--app-accent)', color: 'var(--text-on-accent)' }}>
                {multiDragRef.current.length}
              </span>
            )}
          </div>
        )}
      </DragOverlay>

      <DropIndicator />
    </DndContext>
    <ToastContainer />
    </>
  )
}
