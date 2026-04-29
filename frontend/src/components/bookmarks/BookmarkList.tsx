import { useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject, ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragMoveEvent,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Bookmark } from '../../types'
import { renderHighlightedText } from '../../utils/searchHighlight'
import { Icon } from '../ui/Icon'
import { Tooltip } from '../ui/Tooltip'
import { BookmarkActionButton } from './BookmarkActionButton'
import { FaviconImage } from './FaviconImage'

type BookmarkListProps = {
  bookmarks: Bookmark[]
  canReorder: boolean
  getFolderName: (folderId: string | null) => string | null
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onDelete: (bookmarkId: string) => void
  onEdit: (bookmark: Bookmark) => void
  onFetchNextPage: () => void
  onFavorite: (bookmarkId: string) => void
  onMoveToFolder: (bookmarkId: string, folderId: string | null) => void
  onReorder: (activeId: string, overId: string | null, position: 'before' | 'after' | 'end') => void
  onToggleSelect: (bookmarkId: string) => void
  searchQuery: string
  selectedIds: Set<string>
}

type BookmarkSidebarDropTarget = {
  element: HTMLElement
  folderId: string | null
}

type BookmarkRowProps = {
  bookmark: Bookmark
  dragEnabled: boolean
  dragTooltip: string
  folderName: string | null
  hostname: string
  overlay?: boolean
  onDelete: (bookmarkId: string) => void
  onEdit: (bookmark: Bookmark) => void
  onFavorite: (bookmarkId: string) => void
  onToggleSelect: (bookmarkId: string) => void
  selected: boolean
  searchQuery: string
}

type SortableBookmarkRowProps = BookmarkRowProps & {
  bookmarkId: string
  dragActive: boolean
  dropActive: boolean
  itemTop: number
  measureElement: (element: HTMLDivElement | null) => void
}

const endDropZoneHeight = 12
const listBottomPadding = 16
const loadingIndicatorHeight = 36
const bookmarkEndDropZoneId = '__bookmark-sort-end__'
const bookmarkDropTargetSelector = '[data-bookmark-drop-target]'

export function BookmarkList({
  bookmarks,
  canReorder,
  getFolderName,
  hasNextPage,
  isFetchingNextPage,
  onDelete,
  onEdit,
  onFetchNextPage,
  onFavorite,
  onMoveToFolder,
  onReorder,
  onToggleSelect,
  searchQuery,
  selectedIds,
}: BookmarkListProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null)
  const [overItemId, setOverItemId] = useState<string | null>(null)
  const highlightedSidebarTargetRef = useRef<HTMLElement | null>(null)

  const rows = useMemo(() => bookmarks, [bookmarks])
  const bookmarkIds = useMemo(() => rows.map((bookmark) => bookmark.id), [rows])
  const activeBookmark = useMemo(
    () => rows.find((bookmark) => bookmark.id === activeBookmarkId) ?? null,
    [activeBookmarkId, rows],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 78,
    getItemKey: (index) => rows[index]?.id ?? index,
    getScrollElement: () => parentRef.current,
    measureElement: (element) => element?.getBoundingClientRect().height ?? 78,
    overscan: 8,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const lastVirtualItem = virtualItems[virtualItems.length - 1]

  useEffect(() => {
    if (!lastVirtualItem || !hasNextPage || isFetchingNextPage) {
      return
    }

    if (lastVirtualItem.index >= rows.length - 5) {
      onFetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, lastVirtualItem, onFetchNextPage, rows.length])

  useEffect(() => {
    return () => {
      clearSidebarDropHighlight(highlightedSidebarTargetRef)
    }
  }, [])

  const dragEnabled = canReorder
  const dragTooltip = canReorder
    ? '当前已加载内容可拖拽排序，也可拖到左侧文件夹中移动'
    : '当前视图不支持排序'
  const totalHeight =
    rowVirtualizer.getTotalSize() +
    (dragEnabled ? endDropZoneHeight : 0) +
    (isFetchingNextPage ? loadingIndicatorHeight : 0) +
    listBottomPadding

  const syncSidebarTarget = (event: DragMoveEvent | DragEndEvent) => {
    const target = resolveSidebarDropTarget(event.active.rect.current.translated)
    applySidebarDropHighlight(highlightedSidebarTargetRef, target?.element ?? null)
    return target
  }

  const handleDragMove = (event: DragMoveEvent) => {
    if (!dragEnabled) {
      return
    }

    const sidebarTarget = syncSidebarTarget(event)
    if (sidebarTarget) {
      setOverItemId(null)
      return
    }

    if (typeof event.over?.id === 'string') {
      setOverItemId(event.over.id)
      return
    }

    setOverItemId(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const sidebarTarget = syncSidebarTarget(event)

    clearSidebarDropHighlight(highlightedSidebarTargetRef)
    setActiveBookmarkId(null)
    setOverItemId(null)

    if (sidebarTarget) {
      onMoveToFolder(activeId, sidebarTarget.folderId)
      return
    }

    if (!event.over) {
      return
    }

    const overId = String(event.over.id)
    if (overId === activeId) {
      return
    }

    if (overId === bookmarkEndDropZoneId) {
      onReorder(activeId, null, 'end')
      return
    }

    const activeIndex = bookmarkIds.indexOf(activeId)
    const overIndex = bookmarkIds.indexOf(overId)
    if (activeIndex === -1 || overIndex === -1) {
      return
    }

    const reorderedIds = arrayMove(bookmarkIds, activeIndex, overIndex)
    const finalIndex = reorderedIds.indexOf(activeId)
    const nextId = reorderedIds[finalIndex + 1] ?? null

    if (nextId === null) {
      onReorder(activeId, null, 'end')
      return
    }

    onReorder(activeId, nextId, 'before')
  }

  const handleDragCancel = () => {
    clearSidebarDropHighlight(highlightedSidebarTargetRef)
    setActiveBookmarkId(null)
    setOverItemId(null)
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
      onDragMove={handleDragMove}
      onDragStart={({ active }) => setActiveBookmarkId(String(active.id))}
      sensors={sensors}
    >
      <div className="page-section flex h-full min-h-[20rem] flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto" ref={parentRef}>
          <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
            <SortableContext items={bookmarkIds} strategy={verticalListSortingStrategy}>
              {virtualItems.map((virtualRow) => {
                const bookmark = rows[virtualRow.index]
                const folderName = getFolderName(bookmark.folder_id)
                const hostname = formatHostname(bookmark.url)
                const selected = selectedIds.has(bookmark.id)

                return (
                  <SortableBookmarkRow
                    bookmark={bookmark}
                    bookmarkId={bookmark.id}
                    dragActive={activeBookmarkId === bookmark.id}
                    dragEnabled={dragEnabled}
                    dragTooltip={dragTooltip}
                    dropActive={dragEnabled && overItemId === bookmark.id && activeBookmarkId !== bookmark.id}
                    folderName={folderName}
                    hostname={hostname}
                    itemTop={virtualRow.start}
                    key={bookmark.id}
                    measureElement={rowVirtualizer.measureElement}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onFavorite={onFavorite}
                    onToggleSelect={onToggleSelect}
                    searchQuery={searchQuery}
                    selected={selected}
                  />
                )
              })}

              {dragEnabled ? (
                <div className="absolute left-0 w-full" style={{ transform: `translateY(${rowVirtualizer.getTotalSize()}px)` }}>
                  <BookmarkEndDropZone active={overItemId === bookmarkEndDropZoneId} />
                </div>
              ) : null}
            </SortableContext>

            {isFetchingNextPage ? (
              <div
                className="absolute left-0 w-full px-4 py-2 text-[12px] leading-4 text-[var(--color-text-secondary)]"
                style={{
                  transform: `translateY(${rowVirtualizer.getTotalSize() + (dragEnabled ? endDropZoneHeight : 0)}px)`,
                }}
              >
                正在加载更多书签…
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeBookmark ? (
          <div className="pointer-events-none">
            <BookmarkRow
              bookmark={activeBookmark}
              dragEnabled={false}
              dragTooltip={dragTooltip}
              folderName={getFolderName(activeBookmark.folder_id)}
              hostname={formatHostname(activeBookmark.url)}
              onDelete={onDelete}
              onEdit={onEdit}
              onFavorite={onFavorite}
              onToggleSelect={onToggleSelect}
              overlay
              searchQuery={searchQuery}
              selected={selectedIds.has(activeBookmark.id)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function SortableBookmarkRow({
  bookmark,
  bookmarkId,
  dragActive,
  dragEnabled,
  dragTooltip,
  dropActive,
  folderName,
  hostname,
  itemTop,
  measureElement,
  onDelete,
  onEdit,
  onFavorite,
  onToggleSelect,
  searchQuery,
  selected,
}: SortableBookmarkRowProps) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({
    id: bookmarkId,
    disabled: !dragEnabled,
  })

  return (
    <div
      className="absolute left-0 top-0 w-full"
      data-index={bookmarkId}
      ref={measureElement}
      style={{ transform: `translateY(${itemTop}px)` }}
    >
      <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
        <BookmarkRow
          bookmark={bookmark}
          dragEnabled={dragEnabled}
          dragHandleAttributes={attributes}
          dragHandleListeners={listeners}
          dragHandleRef={setActivatorNodeRef}
          dragTooltip={dragTooltip}
          dragActive={dragActive}
          dropActive={dropActive}
          folderName={folderName}
          hostname={hostname}
          onDelete={onDelete}
          onEdit={onEdit}
          onFavorite={onFavorite}
          onToggleSelect={onToggleSelect}
          searchQuery={searchQuery}
          selected={selected}
        />
      </div>
    </div>
  )
}

function BookmarkRow({
  bookmark,
  dragEnabled,
  dragHandleAttributes,
  dragHandleListeners,
  dragHandleRef,
  dragTooltip,
  dragActive = false,
  dropActive = false,
  folderName,
  hostname,
  overlay = false,
  onDelete,
  onEdit,
  onFavorite,
  onToggleSelect,
  searchQuery,
  selected,
}: BookmarkRowProps & {
  dragActive?: boolean
  dragHandleAttributes?: DraggableAttributes
  dragHandleListeners?: DraggableSyntheticListeners
  dragHandleRef?: (element: HTMLButtonElement | null) => void
  dropActive?: boolean
}) {
  const rowClassName = [
    'group grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-start gap-2 rounded-[10px] px-2 py-2 transition-all duration-150',
    overlay
      ? 'border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[var(--shadow-elevated)]'
      : 'hover:bg-[var(--color-bg-muted)]',
    dropActive ? 'bg-[rgba(29,155,240,0.08)] ring-1 ring-[var(--color-accent)]' : '',
    dragActive && !overlay ? 'opacity-0' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div className={rowClassName}>
        <div className="flex shrink-0 items-start pt-1">
          <Tooltip label={dragTooltip}>
            <button
              {...dragHandleAttributes}
              {...dragHandleListeners}
              aria-label="拖拽排序"
              className={`icon-button h-8 w-8 ${dragEnabled ? 'cursor-grab touch-none' : 'cursor-not-allowed opacity-45'}`}
              disabled={!dragEnabled}
              ref={dragHandleRef}
              type="button"
            >
              <Icon className="text-[14px]" name="grip" />
            </button>
          </Tooltip>
        </div>

        <label className="flex shrink-0 items-center pt-3">
          {overlay ? (
            <span
              className={`block h-4 w-4 rounded border ${
                selected
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                  : 'border-[var(--color-border-strong)] bg-[var(--color-surface)]'
              }`}
            />
          ) : (
            <input
              checked={selected}
              className="h-4 w-4 rounded accent-[var(--color-accent)]"
              onChange={() => onToggleSelect(bookmark.id)}
              type="checkbox"
            />
          )}
        </label>

        {overlay ? (
          <div className="flex min-w-0 items-start gap-3 rounded-[8px] py-1 pr-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]">
              <FaviconImage faviconUrl={bookmark.favicon_url} title={bookmark.title} url={bookmark.url} />
            </div>

            <BookmarkRowDetails
              bookmark={bookmark}
              folderName={folderName}
              hostname={hostname}
              searchQuery={searchQuery}
            />
          </div>
        ) : (
          <a className="flex min-w-0 items-start gap-3 rounded-[8px] py-1 pr-1" href={bookmark.url} rel="noreferrer" target="_blank">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]">
              <FaviconImage faviconUrl={bookmark.favicon_url} title={bookmark.title} url={bookmark.url} />
            </div>

            <BookmarkRowDetails
              bookmark={bookmark}
              folderName={folderName}
              hostname={hostname}
              searchQuery={searchQuery}
            />
          </a>
        )}

        <div className="flex shrink-0 items-center gap-1 self-start pt-1">
          <BookmarkActionButton label={bookmark.is_favorite ? '取消收藏' : '加入收藏'} onClick={() => onFavorite(bookmark.id)}>
            <Icon
              className="text-[14px]"
              filled={bookmark.is_favorite}
              name={bookmark.is_favorite ? 'heart-filled' : 'heart'}
            />
          </BookmarkActionButton>
          <BookmarkActionButton label="编辑书签" onClick={() => onEdit(bookmark)}>
            <Icon className="text-[14px]" name="pencil" />
          </BookmarkActionButton>
          <BookmarkActionButton label="删除书签" onClick={() => onDelete(bookmark.id)}>
            <Icon className="text-[14px]" name="trash" />
          </BookmarkActionButton>
        </div>
      </div>

      <div className="mx-2 border-b border-[var(--color-border)] last:border-b-0" />
    </>
  )
}

function BookmarkRowDetails({
  bookmark,
  folderName,
  hostname,
  searchQuery,
}: {
  bookmark: Bookmark
  folderName: string | null
  hostname: string
  searchQuery: string
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <div className="truncate text-[14px] font-medium leading-5 text-[var(--color-text)]">
          {renderHighlightedText(bookmark.title, searchQuery)}
        </div>
        {bookmark.is_favorite ? <InlineTag>收藏</InlineTag> : null}
        {folderName ? <InlineTag>{folderName}</InlineTag> : null}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-4 text-[var(--color-text-secondary)]">
        <span className="inline-flex items-center gap-1">
          <Icon className="text-[12px]" name="external-link" />
          <span>{renderHighlightedText(hostname, searchQuery)}</span>
        </span>
        {bookmark.description ? (
          <span className="line-clamp-2 max-w-[560px] text-[var(--color-text-tertiary)]">
            {renderHighlightedText(bookmark.description, searchQuery)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function BookmarkEndDropZone({ active }: { active: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: bookmarkEndDropZoneId })

  return (
    <div
      className={`h-3 w-full transition-colors ${active || isOver ? 'bg-[rgba(29,155,240,0.08)]' : 'bg-transparent'}`}
      ref={setNodeRef}
    >
      <div className={`mx-2 h-full border-t-2 ${active || isOver ? 'border-[var(--color-accent)]' : 'border-transparent'}`} />
    </div>
  )
}

function InlineTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-2 py-0.5 text-[11px] leading-4 text-[var(--color-text-secondary)]">
      {children}
    </span>
  )
}

function formatHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function applySidebarDropHighlight(
  highlightedSidebarTargetRef: MutableRefObject<HTMLElement | null>,
  element: HTMLElement | null,
) {
  if (highlightedSidebarTargetRef.current === element) {
    return
  }

  if (highlightedSidebarTargetRef.current) {
    delete highlightedSidebarTargetRef.current.dataset.dndActive
  }

  highlightedSidebarTargetRef.current = element

  if (element) {
    element.dataset.dndActive = 'true'
  }
}

function clearSidebarDropHighlight(highlightedSidebarTargetRef: MutableRefObject<HTMLElement | null>) {
  if (highlightedSidebarTargetRef.current) {
    delete highlightedSidebarTargetRef.current.dataset.dndActive
    highlightedSidebarTargetRef.current = null
  }
}

function resolveSidebarDropTarget(
  rect: { height: number; left: number; top: number; width: number } | null,
): BookmarkSidebarDropTarget | null {
  if (!rect) {
    return null
  }

  const pointerX = rect.left + rect.width / 2
  const pointerY = rect.top + rect.height / 2
  const targetElement = document
    .elementFromPoint(pointerX, pointerY)
    ?.closest<HTMLElement>(bookmarkDropTargetSelector)

  if (!targetElement) {
    return null
  }

  if (targetElement.dataset.bookmarkDropTarget === 'unsorted') {
    return { element: targetElement, folderId: null }
  }

  if (targetElement.dataset.bookmarkDropTarget === 'folder' && targetElement.dataset.folderId) {
    return { element: targetElement, folderId: targetElement.dataset.folderId }
  }

  return null
}
