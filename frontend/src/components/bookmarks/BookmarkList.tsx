import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragMoveEvent,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Bookmark } from '../../types'
import { renderHighlightedText } from '../../utils/searchHighlight'
import { Icon } from '../ui/Icon'
import { Surface } from '../ui/Surface'
import { BookmarkActionButton } from './BookmarkActionButton'
import {
  applySidebarDropHighlight,
  clearSidebarDropHighlight,
  resolveSidebarDropTarget,
} from './bookmarkDragTargets'
import { FaviconImage } from './FaviconImage'

type BookmarkListProps = {
  bookmarks: Bookmark[]
  canReorder: boolean
  getFolderName: (folderId: string | null) => string | null
  onDelete: (bookmarkId: string) => void
  onEdit: (bookmark: Bookmark) => void
  onFavorite: (bookmarkId: string) => void
  onMoveToFolder: (bookmarkIds: string[], folderId: string | null) => void
  onReorder: (orderedIds: string[]) => void
  onToggleSelect: (bookmarkId: string) => void
  searchQuery: string
  selectedIds: Set<string>
}

const bookmarkEndDropZoneId = '__bookmark-sort-end__'
type BookmarkDragData = {
  isSelected: boolean
  selectedIds: string[]
}

export function BookmarkList({
  bookmarks,
  canReorder,
  getFolderName,
  onDelete,
  onEdit,
  onFavorite,
  onMoveToFolder,
  onReorder,
  onToggleSelect,
  searchQuery,
  selectedIds,
}: BookmarkListProps) {
  const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null)
  const [overItemId, setOverItemId] = useState<string | null>(null)
  const highlightedSidebarTargetRef = useRef<HTMLElement | null>(null)
  const suppressClickUntilRef = useRef(0)

  const bookmarkIds = useMemo(() => bookmarks.map((bookmark) => bookmark.id), [bookmarks])
  const activeBookmark = useMemo(
    () => bookmarks.find((bookmark) => bookmark.id === activeBookmarkId) ?? null,
    [activeBookmarkId, bookmarks],
  )
  const activeSelectionCount =
    activeBookmarkId && selectedIds.has(activeBookmarkId) ? selectedIds.size : activeBookmarkId ? 1 : 0

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 120, tolerance: 6 },
    }),
  )

  useEffect(() => {
    return () => {
      clearSidebarDropHighlight(highlightedSidebarTargetRef)
    }
  }, [])

  useEffect(() => {
    if (!activeBookmarkId) {
      return
    }

    const previousCursor = document.body.style.cursor
    document.body.style.cursor = 'grabbing'

    return () => {
      document.body.style.cursor = previousCursor
    }
  }, [activeBookmarkId])

  const syncSidebarTarget = (event: DragMoveEvent | DragEndEvent) => {
    const target = resolveSidebarDropTarget(event.active.rect.current.translated)
    applySidebarDropHighlight(highlightedSidebarTargetRef, target?.element ?? null)
    return target
  }

  const handleDragMove = (event: DragMoveEvent) => {
    const sidebarTarget = syncSidebarTarget(event)
    const dragData = event.active.data.current as BookmarkDragData | undefined

    if (sidebarTarget) {
      setOverItemId(null)
      return
    }

    if (typeof event.over?.id === 'string') {
      const nextOverId = event.over.id
      if (dragData?.isSelected && dragData.selectedIds.includes(nextOverId)) {
        setOverItemId(null)
        return
      }

      setOverItemId(event.over.id)
      return
    }

    setOverItemId(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const sidebarTarget = syncSidebarTarget(event)
    const dragData = event.active.data.current as BookmarkDragData | undefined
    const draggedBookmarkIds = dragData?.isSelected ? dragData.selectedIds : [activeId]

    clearSidebarDropHighlight(highlightedSidebarTargetRef)
    setActiveBookmarkId(null)
    setOverItemId(null)
    suppressClickUntilRef.current = Date.now() + 180

    if (sidebarTarget) {
      onMoveToFolder(draggedBookmarkIds, sidebarTarget.folderId)
      return
    }

    if (!canReorder || !event.over) {
      return
    }

    const overId = String(event.over.id)
    if (overId !== bookmarkEndDropZoneId && draggedBookmarkIds.includes(overId)) {
      return
    }

    if (overId === bookmarkEndDropZoneId) {
      const reorderedToEnd = reorderDraggedBookmarks(bookmarks, draggedBookmarkIds, null)
      if (reorderedToEnd) {
        onReorder(reorderedToEnd)
      }
      return
    }

    const reorderedIds = reorderDraggedBookmarks(bookmarks, draggedBookmarkIds, overId)
    if (reorderedIds) {
      onReorder(reorderedIds)
    }
  }

  const handleDragCancel = () => {
    clearSidebarDropHighlight(highlightedSidebarTargetRef)
    setActiveBookmarkId(null)
    setOverItemId(null)
    suppressClickUntilRef.current = Date.now() + 180
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
      onDragMove={handleDragMove}
      onDragStart={({ active }) => {
        setActiveBookmarkId(String(active.id))
        suppressClickUntilRef.current = Date.now() + 180
      }}
      sensors={sensors}
    >
      <div className="page-section overflow-hidden">
        <SortableContext items={bookmarkIds} strategy={verticalListSortingStrategy}>
          {bookmarks.map((bookmark) => {
            const folderName = getFolderName(bookmark.folder_id)
            const hostname = formatHostname(bookmark.url)

            return (
              <SortableBookmarkRow
                bookmark={bookmark}
                dropActive={overItemId === bookmark.id && activeBookmarkId !== bookmark.id}
                folderName={folderName}
                hostname={hostname}
                isDragging={activeBookmarkId === bookmark.id}
                key={bookmark.id}
                onDelete={onDelete}
                onEdit={onEdit}
                onFavorite={onFavorite}
                onToggleSelect={onToggleSelect}
                searchQuery={searchQuery}
                selected={selectedIds.has(bookmark.id)}
                selectedIds={Array.from(selectedIds)}
                suppressClickUntilRef={suppressClickUntilRef}
              />
            )
          })}
          {canReorder ? <BookmarkEndDropZone active={overItemId === bookmarkEndDropZoneId} /> : null}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeBookmark ? (
          activeSelectionCount > 1 ? (
            <Surface className="px-4 py-3 shadow-[var(--shadow-elevated)]" tone="elevated">
              <p className="text-[13px] font-medium leading-5 text-[var(--color-text)]">
                已选择 {activeSelectionCount} 项
              </p>
            </Surface>
          ) : (
            <BookmarkRow
              bookmark={activeBookmark}
              folderName={getFolderName(activeBookmark.folder_id)}
              hostname={formatHostname(activeBookmark.url)}
              onDelete={onDelete}
              onEdit={onEdit}
              onFavorite={onFavorite}
              onToggleSelect={onToggleSelect}
              overlay
              searchQuery={searchQuery}
              selected={selectedIds.has(activeBookmark.id)}
              suppressClickUntilRef={suppressClickUntilRef}
            />
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function SortableBookmarkRow({
  bookmark,
  dropActive,
  folderName,
  hostname,
  isDragging,
  onDelete,
  onEdit,
  onFavorite,
  onToggleSelect,
  searchQuery,
  selected,
  selectedIds,
  suppressClickUntilRef,
}: BookmarkRowProps & { dropActive: boolean; isDragging: boolean; selectedIds: string[] }) {
  const { attributes, listeners, setNodeRef, transition, transform } = useSortable({
    id: bookmark.id,
    data: {
      isSelected: selected,
      selectedIds,
    } satisfies BookmarkDragData,
  })

  return (
    <div
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      className={`touch-none select-none ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <BookmarkRow
        bookmark={bookmark}
        dropActive={dropActive}
        folderName={folderName}
        hostname={hostname}
        isDragging={isDragging}
        onDelete={onDelete}
        onEdit={onEdit}
        onFavorite={onFavorite}
        onToggleSelect={onToggleSelect}
        searchQuery={searchQuery}
        selected={selected}
        suppressClickUntilRef={suppressClickUntilRef}
      />
    </div>
  )
}

type BookmarkRowProps = {
  bookmark: Bookmark
  dropActive?: boolean
  folderName: string | null
  hostname: string
  isDragging?: boolean
  onDelete: (bookmarkId: string) => void
  onEdit: (bookmark: Bookmark) => void
  onFavorite: (bookmarkId: string) => void
  onToggleSelect: (bookmarkId: string) => void
  overlay?: boolean
  searchQuery: string
  selected: boolean
  suppressClickUntilRef: { current: number }
}

function BookmarkRow({
  bookmark,
  dropActive = false,
  folderName,
  hostname,
  isDragging = false,
  onDelete,
  onEdit,
  onFavorite,
  onToggleSelect,
  overlay = false,
  searchQuery,
  selected,
  suppressClickUntilRef,
}: BookmarkRowProps) {
  return (
    <>
      <div
        className={`group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-3 py-3 transition-colors duration-150 ${
          selected ? 'bg-[rgba(29,155,240,0.08)]' : ''
        } ${dropActive ? 'bg-[rgba(29,155,240,0.12)] ring-1 ring-[var(--color-accent)]' : ''} ${
          isDragging && !overlay ? 'opacity-60' : ''
        } ${overlay ? 'rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[var(--shadow-elevated)]' : 'hover:bg-[var(--color-bg-muted)]'}`}
      >
        <label className="mt-2 flex items-center" onClick={(event) => event.stopPropagation()}>
          <input
            checked={selected}
            className="h-4 w-4 rounded accent-[var(--color-accent)]"
            onChange={() => onToggleSelect(bookmark.id)}
            onPointerDown={(event) => event.stopPropagation()}
            type="checkbox"
          />
        </label>

        {overlay ? (
          <div className="flex min-w-0 items-start gap-3">
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
          <div className="flex min-w-0 items-start gap-3 rounded-[8px]">
            <a
              className="flex min-w-0 items-start gap-3 rounded-[8px] cursor-default"
              draggable={false}
              href={bookmark.url}
              onDragStart={(event) => event.preventDefault()}
              onClick={(event) => {
                if (Date.now() < suppressClickUntilRef.current) {
                  event.preventDefault()
                }
              }}
              rel="noreferrer"
              target="_blank"
            >
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
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1">
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

      {!overlay ? <div className="mx-3 border-b border-[var(--color-border)] last:border-b-0" /> : null}
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
      <div className={`mx-3 h-full border-t-2 ${active || isOver ? 'border-[var(--color-accent)]' : 'border-transparent'}`} />
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

function reorderDraggedBookmarks(
  bookmarks: Bookmark[],
  draggedBookmarkIds: string[],
  overId: string | null,
) {
  const allBookmarkIds = bookmarks.map((bookmark) => bookmark.id)
  const dragIdSet = new Set(draggedBookmarkIds.filter((id) => allBookmarkIds.includes(id)))

  if (dragIdSet.size === 0) {
    return null
  }

  if (overId && dragIdSet.has(overId)) {
    return null
  }

  const indexedBookmarks = bookmarks.map((bookmark, index) => ({ bookmark, index }))
  const selectedEntries = indexedBookmarks.filter(({ bookmark }) => dragIdSet.has(bookmark.id))
  const remainingEntries = indexedBookmarks.filter(({ bookmark }) => !dragIdSet.has(bookmark.id))

  const selectedIdsInOrder = selectedEntries.map(({ bookmark }) => bookmark.id)
  const remainingIds = remainingEntries.map(({ bookmark }) => bookmark.id)

  const nextIds =
    overId === null
      ? [...remainingIds, ...selectedIdsInOrder]
      : (() => {
          const targetEntry = indexedBookmarks.find(({ bookmark }) => bookmark.id === overId)
          if (!targetEntry) {
            return null
          }

          const removedBeforeTarget = selectedEntries.filter(({ index }) => index < targetEntry.index).length
          const targetIndexInRemaining = targetEntry.index - removedBeforeTarget

          return [
            ...remainingIds.slice(0, targetIndexInRemaining + 1),
            ...selectedIdsInOrder,
            ...remainingIds.slice(targetIndexInRemaining + 1),
          ]
        })()

  if (!nextIds || nextIds.every((id, index) => id === allBookmarkIds[index])) {
    return null
  }

  return nextIds
}
