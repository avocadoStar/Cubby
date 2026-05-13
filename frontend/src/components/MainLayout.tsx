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
import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  DndContext,
  DragOverlay,
  getClientRect,
  type Modifier,
} from '@dnd-kit/core'
import { pointerClosestCenter } from '../lib/dndUtils'
import type { Folder, Bookmark } from '../types'
import { useDragAndDrop } from '../hooks/useDragAndDrop'
import { useIsMobile } from '../hooks/useIsMobile'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { t } from '../i18n'
import { useListItems } from '../hooks/useListItems'
import MobileLayout from './mobile/MobileLayout'
import DragOverlayContent from './DragOverlayContent'

export type ListItem =
  | { kind: 'folder'; folder: Folder }
  | { kind: 'bookmark'; bookmark: Bookmark }

import ItemDroppable from './ItemDroppable'
import DraggableFolderRow from './FolderRow'
import SearchResults from './SearchResults'
import NotesPanel from './NotesPanel'

export default function MainLayout() {
  const isMobile = useIsMobile()

  if (isMobile) return <MobileLayout />
  return <DesktopMainLayout />
}

function DesktopMainLayout() {
  const { selectedId, folderMap, select } = useFolderStore()
  const { activeItem, activeId } = useDndStore()
  const { query: searchQuery, results: searchResults } = useSearchStore()
  const isSearching = searchQuery !== ''
  const [notesBookmarkId, setNotesBookmarkId] = useState<string | null>(null)

  const { items, renderedItems, subFolderIds, load, loading } = useListItems(selectedId)
  const bookmarks = useBookmarkStore(s => s.bookmarks)
  const selectedFolderIds = useSelectionStore(s => s.selectedFolderIds)
  const toggleFolderSelect = useSelectionStore(s => s.toggleFolderSelect)

  useKeyboardShortcuts(bookmarks, subFolderIds)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load(selectedId)
  }, [load, selectedId])

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
                {t('main.loading')}
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
        <DragOverlayContent activeItem={activeItem} multiDragRef={multiDragRef} />
      </DragOverlay>

      <DropIndicator />
    </DndContext>
    <ToastContainer />
    </>
  )
}
