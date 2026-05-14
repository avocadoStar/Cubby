import { describe, expect, it } from 'vitest'
import type { Bookmark } from '../types'
import { removeSetValue, sortBookmarksBySortKey, sortBookmarksBySortKeyThenId } from './bookmarkStoreHelpers'

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
})
