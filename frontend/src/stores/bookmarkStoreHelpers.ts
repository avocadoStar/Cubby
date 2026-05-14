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
