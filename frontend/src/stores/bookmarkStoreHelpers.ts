import type { Bookmark } from '../types'

export function sortBookmarksBySortKey(bookmarks: Bookmark[]): Bookmark[] {
  return [...bookmarks].sort((a, b) => a.sort_key < b.sort_key ? -1 : 1)
}

export function sortBookmarksBySortKeyThenId(bookmarks: Bookmark[]): Bookmark[] {
  return [...bookmarks].sort((a, b) => (
    a.sort_key < b.sort_key ? -1 : a.sort_key > b.sort_key ? 1 : a.id.localeCompare(b.id)
  ))
}

export function removeSetValue<T>(source: Set<T>, value: T): Set<T> {
  const next = new Set(source)
  next.delete(value)
  return next
}

export function upsertChangedBookmark(
  bookmarks: Bookmark[],
  bookmark: Bookmark,
): { bookmarks: Bookmark[]; changedIds: Set<string> } {
  const exists = bookmarks.some((item) => item.id === bookmark.id)
  const next = exists
    ? bookmarks.map((item) => item.id === bookmark.id ? bookmark : item)
    : [...bookmarks, bookmark]
  return {
    bookmarks: sortBookmarksBySortKeyThenId(next),
    changedIds: new Set([bookmark.id]),
  }
}

export function replaceBookmarkNotes(bookmarks: Bookmark[], id: string, notes: string): Bookmark[] {
  return bookmarks.map((bookmark) => (
    bookmark.id === id ? { ...bookmark, notes } : bookmark
  ))
}

export function removeBookmarkById(bookmarks: Bookmark[], id: string): Bookmark[] {
  return bookmarks.filter((bookmark) => bookmark.id !== id)
}

export function restoreBookmarkToList(bookmarks: Bookmark[], bookmark: Bookmark): Bookmark[] {
  return sortBookmarksBySortKey([...bookmarks, bookmark])
}
