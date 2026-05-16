import type { Bookmark } from '../types'

export type SidePanelState =
  | { type: 'notes'; bookmarkId: string }
  | { type: 'preview'; bookmarkId: string }
  | null

export function getSidePanelBookmark(
  panel: SidePanelState,
  bookmarks: Bookmark[],
): Bookmark | null {
  if (!panel) return null
  return bookmarks.find(bookmark => bookmark.id === panel.bookmarkId) ?? null
}
