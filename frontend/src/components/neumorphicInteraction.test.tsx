import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import Button from './Button'
import BookmarkRow from './BookmarkRow'
import FolderRow from './FolderRow'
import type { Bookmark, Folder } from '../types'

vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    isDragging: false,
  }),
}))

vi.mock('../stores/bookmarkStore', () => ({
  useBookmarkStore: (selector: (state: {
    deletingIds: Set<string>
    recentlyChangedIds: Set<string>
    deleteOne: () => void
  }) => unknown) => selector({
    deletingIds: new Set(),
    recentlyChangedIds: new Set(),
    deleteOne: () => {},
  }),
}))

vi.mock('../stores/selectionStore', () => ({
  useSelectionStore: (selector: (state: {
    selectedIds: Set<string>
    toggleSelect: () => void
  }) => unknown) => selector({
    selectedIds: new Set(),
    toggleSelect: () => {},
  }),
}))

vi.mock('../stores/dndStore', () => ({
  useDndStore: (selector: (state: {
    overId: null
    dropPosition: null
    source: null
  }) => unknown) => selector({
    overId: null,
    dropPosition: null,
    source: null,
  }),
}))

const bookmark: Bookmark = {
  id: 'b1',
  title: 'Example',
  url: 'https://example.com',
  icon: '',
  folder_id: null,
  sort_key: 'n',
  version: 1,
  notes: '',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const folder: Folder = {
  id: 'f1',
  name: 'Folder',
  parent_id: null,
  sort_key: 'n',
  version: 1,
  has_children: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('neumorphic interaction hooks', () => {
  it('exposes a stable button hook without changing button content', () => {
    const html = renderToStaticMarkup(<Button variant="secondary">Save</Button>)

    expect(html).toContain('cubby-button')
    expect(html).toContain('data-variant="secondary"')
    expect(html).toContain('Save')
  })

  it('marks desktop rows for theme-scoped tactile hover styling', () => {
    const bookmarkHtml = renderToStaticMarkup(<BookmarkRow bookmark={bookmark} />)
    const folderHtml = renderToStaticMarkup(
      <FolderRow
        folder={folder}
        isFolderSelected={false}
        onToggleSelect={() => {}}
        onNavigate={() => {}}
        onDelete={() => {}}
      />,
    )

    expect(bookmarkHtml).toContain('neumorphic-row')
    expect(folderHtml).toContain('neumorphic-row')
  })

  it('renders a dedicated bookmark preview action when provided', () => {
    const bookmarkHtml = renderToStaticMarkup(
      <BookmarkRow bookmark={bookmark} onOpenPreview={() => {}} />,
    )

    expect(bookmarkHtml).toContain('aria-label="Preview bookmark"')
    expect(bookmarkHtml).toContain('data-bookmark-preview-action="true"')
  })
})
