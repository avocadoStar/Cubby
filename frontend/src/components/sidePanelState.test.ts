import { describe, expect, it } from 'vitest'
import { getSidePanelBookmark } from './sidePanelState'
import type { Bookmark } from '../types'

const bookmarks: Bookmark[] = [
  {
    id: 'b1',
    title: 'One',
    url: 'https://one.example',
    icon: '',
    folder_id: null,
    sort_key: 'n',
    version: 1,
    notes: '',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

describe('side panel state', () => {
  it('resolves the active bookmark for notes or preview panels', () => {
    expect(getSidePanelBookmark({ type: 'notes', bookmarkId: 'b1' }, bookmarks)?.id).toBe('b1')
    expect(getSidePanelBookmark({ type: 'preview', bookmarkId: 'b1' }, bookmarks)?.id).toBe('b1')
  })

  it('returns null when the panel is closed or the bookmark no longer exists', () => {
    expect(getSidePanelBookmark(null, bookmarks)).toBeNull()
    expect(getSidePanelBookmark({ type: 'preview', bookmarkId: 'missing' }, bookmarks)).toBeNull()
  })
})
