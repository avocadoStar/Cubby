import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
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
  onReorder: (activeId: string, overId: string | null, position: 'before' | 'after' | 'end') => void
  onToggleSelect: (bookmarkId: string) => void
  searchQuery: string
  selectedIds: Set<string>
}

const endDropZoneHeight = 12

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
  onReorder,
  onToggleSelect,
  searchQuery,
  selectedIds,
}: BookmarkListProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: bookmarks.length,
    estimateSize: () => 78,
    getItemKey: (index) => bookmarks[index]?.id ?? index,
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

    if (lastVirtualItem.index >= bookmarks.length - 5) {
      onFetchNextPage()
    }
  }, [bookmarks.length, hasNextPage, isFetchingNextPage, lastVirtualItem, onFetchNextPage])

  const dragEnabled = canReorder
  const dragTooltip = canReorder
    ? '当前已加载内容可拖拽排序，也可拖到左侧文件夹中移动'
    : '当前视图不支持排序'
  const rows = useMemo(() => bookmarks, [bookmarks])
  const totalHeight = rowVirtualizer.getTotalSize() + (dragEnabled ? endDropZoneHeight : 0)

  return (
    <div className="page-section overflow-hidden">
      <div className="max-h-[calc(100vh-18rem)] overflow-x-hidden overflow-y-auto" ref={parentRef}>
        <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
          {virtualItems.map((virtualRow) => {
            const bookmark = rows[virtualRow.index]
            const folderName = getFolderName(bookmark.folder_id)
            const hostname = formatHostname(bookmark.url)
            const selected = selectedIds.has(bookmark.id)

            return (
              <div
                className="absolute left-0 top-0 w-full"
                data-index={virtualRow.index}
                key={bookmark.id}
                ref={rowVirtualizer.measureElement}
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <DropLine
                  active={activeDropZone === `before:${bookmark.id}`}
                  onDrop={(event) => {
                    const draggedId = event.dataTransfer.getData('application/x-cubby-bookmark')
                    if (draggedId && draggedId !== bookmark.id) {
                      onReorder(draggedId, bookmark.id, 'before')
                    }
                    setActiveDropZone(null)
                  }}
                  onEnter={() => setActiveDropZone(`before:${bookmark.id}`)}
                />

                <div className="group flex items-stretch gap-2 px-3 py-2 transition-colors duration-150 hover:bg-[var(--color-bg-muted)]">
                  <label className="flex shrink-0 items-center pt-1">
                    <input
                      checked={selected}
                      className="h-4 w-4 rounded accent-[var(--color-accent)]"
                      onChange={() => onToggleSelect(bookmark.id)}
                      type="checkbox"
                    />
                  </label>

                  <div className="flex shrink-0 items-start pt-1">
                    <Tooltip label={dragTooltip}>
                      <button
                        className={`icon-button h-8 w-8 ${dragEnabled ? 'cursor-grab' : 'cursor-not-allowed opacity-45'}`}
                        draggable={dragEnabled}
                        onDragEnd={() => setActiveDropZone(null)}
                        onDragStart={(event) => {
                          if (!dragEnabled) {
                            event.preventDefault()
                            return
                          }

                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('application/x-cubby-bookmark', bookmark.id)
                        }}
                        type="button"
                      >
                        <Icon className="text-[14px]" name="grip" />
                      </button>
                    </Tooltip>
                  </div>

                  <a
                    className="flex min-w-0 flex-1 items-start gap-3 rounded-[8px] px-1 py-1"
                    href={bookmark.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]">
                      <FaviconImage faviconUrl={bookmark.favicon_url} title={bookmark.title} url={bookmark.url} />
                    </div>

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
                  </a>

                  <div className="flex shrink-0 items-center gap-1 self-start pt-1">
                    <BookmarkActionButton label={bookmark.is_favorite ? '取消收藏' : '加入收藏'} onClick={() => onFavorite(bookmark.id)}>
                      <Icon className="text-[14px]" filled={bookmark.is_favorite} name={bookmark.is_favorite ? 'heart-filled' : 'heart'} />
                    </BookmarkActionButton>
                    <BookmarkActionButton label="编辑书签" onClick={() => onEdit(bookmark)}>
                      <Icon className="text-[14px]" name="pencil" />
                    </BookmarkActionButton>
                    <BookmarkActionButton label="删除书签" onClick={() => onDelete(bookmark.id)}>
                      <Icon className="text-[14px]" name="trash" />
                    </BookmarkActionButton>
                  </div>
                </div>

                <div className="mx-3 border-b border-[var(--color-border)] last:border-b-0" />
              </div>
            )
          })}

          {dragEnabled ? (
            <div className="absolute left-0 w-full" style={{ transform: `translateY(${rowVirtualizer.getTotalSize()}px)` }}>
              <DropLine
                active={activeDropZone === 'end'}
                onDrop={(event) => {
                  const draggedId = event.dataTransfer.getData('application/x-cubby-bookmark')
                  if (draggedId) {
                    onReorder(draggedId, null, 'end')
                  }
                  setActiveDropZone(null)
                }}
                onEnter={() => setActiveDropZone('end')}
              />
            </div>
          ) : null}
        </div>

        {isFetchingNextPage ? (
          <div className="px-4 py-3 text-[12px] leading-4 text-[var(--color-text-secondary)]">正在加载更多书签…</div>
        ) : null}
      </div>
    </div>
  )
}

function DropLine({
  active,
  onDrop,
  onEnter,
}: {
  active: boolean
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onEnter: () => void
}) {
  return (
    <div
      className={`h-3 w-full ${active ? 'bg-[rgba(29,155,240,0.08)]' : 'bg-transparent'}`}
      onDragEnter={(event) => {
        event.preventDefault()
        onEnter()
      }}
      onDragOver={(event) => {
        event.preventDefault()
        onEnter()
      }}
      onDrop={(event) => {
        event.preventDefault()
        onDrop(event)
      }}
    >
      <div className={`mx-3 h-full border-t-2 ${active ? 'border-[var(--color-accent)]' : 'border-transparent'}`} />
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
