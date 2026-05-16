import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import ContextMenu from './ContextMenu'

let targetType: 'bookmark' | 'folder' = 'bookmark'

vi.mock('../hooks/useContextMenu', () => ({
  useContextMenu: () => ({
    menu: { x: 12, y: 24 },
    target: { id: 'target-1', type: targetType },
    menuRef: { current: null },
    closeMenu: vi.fn(),
  }),
}))

vi.mock('../hooks/useContextActions', () => ({
  useContextActions: () => ({
    openUrl: vi.fn(),
    handleCopyLink: vi.fn(),
    handleDelete: vi.fn(),
  }),
}))

vi.mock('../stores/bookmarkStore', () => ({
  useBookmarkStore: {
    getState: () => ({ bookmarks: [] }),
  },
}))

vi.mock('./EditBookmarkModal', () => ({
  default: () => <span>EditBookmarkModal</span>,
}))

vi.mock('./RenameFolderModal', () => ({
  default: () => <span>RenameFolderModal</span>,
}))

describe('ContextMenu', () => {
  it('shows preview for bookmark targets', () => {
    targetType = 'bookmark'

    const html = renderToStaticMarkup(<ContextMenu onPreviewBookmark={() => {}} />)

    expect(html).toContain('预览')
  })

  it('does not show preview for folder targets', () => {
    targetType = 'folder'

    const html = renderToStaticMarkup(<ContextMenu onPreviewBookmark={() => {}} />)

    expect(html).not.toContain('预览')
  })
})
