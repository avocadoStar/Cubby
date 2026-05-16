import Spinner from './Spinner'
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
import PreviewPanel from './PreviewPanel'
import { getSidePanelBookmark, type SidePanelState } from './sidePanelState'

function ListSkeleton() {
  return (
    <div
      aria-label={t('main.loading')}
      className="px-4 py-3 text-app-text3"
    >
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 h-[46px] animate-pulse border-b border-transparent"
        >
          <div
            className="flex-shrink-0 rounded w-[18px] h-[18px] bg-app-hover shadow-input-base"
          />
          <div className="flex-1 min-w-0">
            <div
              className="rounded mb-2 h-[10px] bg-app-hover"
              style={{
                width: `${index % 3 === 0 ? 42 : index % 3 === 1 ? 58 : 72}%`,
              }}
            />
            <div
              className="rounded h-[8px] bg-app-hover opacity-[0.72]"
              style={{
                width: `${index % 2 === 0 ? 28 : 36}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function ListLoadingOverlay() {
  return (
    <div
      aria-label={t('main.loading')}
      className="absolute inset-0 z-10 flex justify-center pt-4 pointer-events-none bg-[rgba(255,255,255,0.28)] backdrop-blur-[1px]"
    >
      <div
        className="inline-flex items-center gap-2 h-8 px-3 rounded-full text-sm shadow-app-lg bg-app-card border border-input-border text-app-text2"
      >
        <Spinner size="sm" />
        <span>{t('main.loading')}</span>
      </div>
    </div>
  )
}

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
  const [sidePanel, setSidePanel] = useState<SidePanelState>(null)

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
      <div className="flex h-screen relative bg-app-bg">
        <ContextMenu onPreviewBookmark={(bookmarkId) => setSidePanel({ type: 'preview', bookmarkId })} />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Toolbar />
          <BatchActionBar />
          {isSearching ? (
            <SearchResults query={searchQuery} results={searchResults} />
          ) : (
          <>
          <div className="flex-1 theme-scrollbar overflow-auto" ref={scrollRef}>
            {loading && items.length === 0 ? (
              <ListSkeleton />
            ) : (
            <div className="relative min-h-full">
              <div className="relative" style={{ height: rowVirtualizer.getTotalSize() + 8 }}>
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
                      <BookmarkRow
                        bookmark={item.bookmark}
                        onOpenNotes={() => setSidePanel(prev => prev?.type === 'notes' && prev.bookmarkId === item.bookmark.id ? null : { type: 'notes', bookmarkId: item.bookmark.id })}
                        onOpenPreview={() => setSidePanel(prev => prev?.type === 'preview' && prev.bookmarkId === item.bookmark.id ? null : { type: 'preview', bookmarkId: item.bookmark.id })}
                      />
                    </ItemDroppable>
                  )
                })}
              </div>
              {loading && <ListLoadingOverlay />}
            </div>
            )}
          </div>
          </>
          )}
        </div>
        <NotesPanel bookmark={sidePanel?.type === 'notes' ? getSidePanelBookmark(sidePanel, bookmarks) : null} onClose={() => setSidePanel(null)} />
        <PreviewPanel bookmark={sidePanel?.type === 'preview' ? getSidePanelBookmark(sidePanel, bookmarks) : null} onClose={() => setSidePanel(null)} />
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
