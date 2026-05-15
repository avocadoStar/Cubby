import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileBookmarkListContent } from './MobileBookmarkList'
import type { Bookmark, Folder } from '../../types'
import { useBookmarkStore } from '../../stores/bookmarkStore'

vi.mock('../../services/api', () => ({
  api: {
    getBookmarks: vi.fn(),
    deleteBookmark: vi.fn(),
    restoreBookmark: vi.fn(),
    getFolders: vi.fn(),
  },
}))

vi.mock('../../lib/errorHandler', () => ({
  showMoveError: vi.fn(),
}))

const makeBookmark = (overrides: Partial<Bookmark>): Bookmark => ({
  id: 'b1',
  title: 'Bookmark',
  url: 'https://example.com',
  icon: '',
  folder_id: null,
  sort_key: 'n',
  version: 1,
  notes: '',
  created_at: '',
  updated_at: '',
  ...overrides,
})

const makeFolder = (overrides: Partial<Folder>): Folder => ({
  id: 'f1',
  name: 'Folder',
  parent_id: null,
  sort_key: 'n',
  version: 1,
  has_children: false,
  created_at: '',
  updated_at: '',
  ...overrides,
})

describe('MobileBookmarkList', () => {
  afterEach(() => {
    useBookmarkStore.setState({
      bookmarks: [],
      loading: false,
      deletingIds: new Set(),
      recentlyChangedIds: new Set(),
    })
  })

  it('renders folders and bookmarks in shared sort order on mobile', () => {
    const folder = makeFolder({ id: 'f1', name: 'Middle Folder', sort_key: 'm' })
    const firstBookmark = makeBookmark({ id: 'b1', title: 'Alpha Bookmark', sort_key: 'a' })
    const lastBookmark = makeBookmark({ id: 'b2', title: 'Omega Bookmark', sort_key: 'z' })

    const html = renderToStaticMarkup(
      <MobileBookmarkListContent
        items={[
          { kind: 'bookmark', bookmark: firstBookmark },
          { kind: 'folder', folder },
          { kind: 'bookmark', bookmark: lastBookmark },
        ]}
        loading={false}
        onSelectFolder={vi.fn()}
        onOpenNotes={vi.fn()}
        onDeleteBookmark={vi.fn()}
      />,
    )

    const alphaIndex = html.indexOf('Alpha Bookmark')
    const folderIndex = html.indexOf('Middle Folder')
    const omegaIndex = html.indexOf('Omega Bookmark')

    expect(alphaIndex).toBeGreaterThanOrEqual(0)
    expect(folderIndex).toBeGreaterThan(alphaIndex)
    expect(omegaIndex).toBeGreaterThan(folderIndex)
  })

  it('marks a mobile bookmark item while it is deleting', () => {
    const bookmark = makeBookmark({ id: 'b1', title: 'Deleting Bookmark' })
    const html = renderToStaticMarkup(
      <MobileBookmarkListContent
        items={[{ kind: 'bookmark', bookmark }]}
        loading={false}
        deletingBookmarkIds={new Set(['b1'])}
        onSelectFolder={vi.fn()}
        onOpenNotes={vi.fn()}
        onDeleteBookmark={vi.fn()}
      />,
    )

    expect(html).toContain('data-deleting="true"')
    expect(html).toContain('bookmark-delete-motion')
  })
})
