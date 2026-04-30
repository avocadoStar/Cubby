import type { ReactNode } from 'react'
import type { Bookmark } from '../../types'
import { renderHighlightedText } from '../../utils/searchHighlight'
import { Icon } from '../ui/Icon'
import { Surface } from '../ui/Surface'
import { BookmarkActionButton } from './BookmarkActionButton'
import { FaviconImage } from './FaviconImage'

type BookmarkGridProps = {
  bookmarks: Bookmark[]
  getFolderName: (folderId: string | null) => string | null
  onDelete: (bookmarkId: string) => void
  onEdit: (bookmark: Bookmark) => void
  onFavorite: (bookmarkId: string) => void
  searchQuery: string
  selectedIds: Set<string>
}

export function BookmarkGrid({
  bookmarks,
  getFolderName,
  onDelete,
  onEdit,
  onFavorite,
  searchQuery,
  selectedIds,
}: BookmarkGridProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {bookmarks.map((bookmark) => {
        const hostname = formatHostname(bookmark.url)
        const folderName = getFolderName(bookmark.folder_id)

        return (
          <Surface
            className={`group flex h-full flex-col gap-4 p-4 transition-colors duration-150 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-subtle)] ${
              selectedIds.has(bookmark.id) ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]' : ''
            }`}
            key={bookmark.id}
            tone="panel"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="ml-auto flex items-center gap-1">
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

            <a className="flex min-w-0 flex-1 flex-col gap-3 cursor-default" draggable={false} href={bookmark.url} onDragStart={(event) => event.preventDefault()} rel="noreferrer" target="_blank">
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]">
                <FaviconImage faviconUrl={bookmark.favicon_url} title={bookmark.title} url={bookmark.url} />
              </div>
              <div className="min-w-0 space-y-2">
                <div className="truncate text-[14px] font-medium leading-5 text-[var(--color-text)]">
                  {renderHighlightedText(bookmark.title, searchQuery)}
                </div>
                <div className="truncate text-[12px] leading-4 text-[var(--color-text-secondary)]">
                  {renderHighlightedText(hostname, searchQuery)}
                </div>
                <p className="line-clamp-2 text-[13px] leading-5 text-[var(--color-text-secondary)]">
                  {renderHighlightedText(bookmark.description || '暂无备注', searchQuery)}
                </p>
              </div>
            </a>

            <div className="flex flex-wrap items-center gap-2">
              {bookmark.is_favorite ? <InlineTag>收藏</InlineTag> : null}
              {folderName ? <InlineTag>{folderName}</InlineTag> : null}
            </div>
          </Surface>
        )
      })}
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
