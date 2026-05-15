import { describe, expect, it } from 'vitest'
import type { Bookmark } from '../types'
import {
  removeBookmarkById,
  removeSetValue,
  replaceBookmarkNotes,
  restoreBookmarkToList,
  sortBookmarksBySortKey,
  sortBookmarksBySortKeyThenId,
  upsertChangedBookmark,
} from './bookmarkStoreHelpers'

function bookmark(id: string, sortKey: string): Bookmark {
  return {
    id,
    title: id,
    url: `https://${id}.example.com`,
    icon: '',
    folder_id: null,
    sort_key: sortKey,
    version: 1,
    notes: '',
    created_at: '',
    updated_at: '',
  }
}

describe('bookmark store helpers', () => {
  it('sorts bookmarks by sort key without mutating the source array', () => {
    const source = [bookmark('b', 'z'), bookmark('a', 'a')]

    expect(sortBookmarksBySortKey(source).map((item) => item.id)).toEqual(['a', 'b'])
    expect(source.map((item) => item.id)).toEqual(['b', 'a'])
  })

  it('uses id as a deterministic tie breaker when requested', () => {
    const source = [bookmark('b', 'n'), bookmark('a', 'n')]

    expect(sortBookmarksBySortKeyThenId(source).map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('removes a value from a cloned set', () => {
    const source = new Set(['a', 'b'])
    const result = removeSetValue(source, 'a')

    expect(Array.from(result)).toEqual(['b'])
    expect(Array.from(source)).toEqual(['a', 'b'])
  })

  it('upserts bookmarks and reports the changed id', () => {
    const source = [bookmark('a', 'a')]
    const changed = bookmark('b', 'z')

    const result = upsertChangedBookmark(source, changed)

    expect(result.bookmarks.map((item) => item.id)).toEqual(['a', 'b'])
    expect(Array.from(result.changedIds)).toEqual(['b'])
  })

  it('replaces notes without changing other bookmarks', () => {
    const source = [bookmark('a', 'a'), bookmark('b', 'b')]

    const result = replaceBookmarkNotes(source, 'b', 'new notes')

    expect(result.find((item) => item.id === 'b')?.notes).toBe('new notes')
    expect(result.find((item) => item.id === 'a')?.notes).toBe('')
  })

  it('removes and restores bookmarks through pure list helpers', () => {
    const source = [bookmark('a', 'a'), bookmark('b', 'b')]
    const removed = removeBookmarkById(source, 'a')
    const restored = restoreBookmarkToList(removed, source[0])

    expect(removed.map((item) => item.id)).toEqual(['b'])
    expect(restored.map((item) => item.id)).toEqual(['a', 'b'])
  })
})
