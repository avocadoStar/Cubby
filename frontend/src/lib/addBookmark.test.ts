import { describe, expect, it } from 'vitest'
import { ConflictError } from '../services/api'
import {
  DUPLICATE_URL_MESSAGE,
  hasFetchedBookmarkTitle,
  isDuplicateURLConflict,
  mergeFetchedBookmarkTitle,
  normalizeBookmarkUrlForSubmit,
  normalizeBookmarkUrlInput,
} from './addBookmark'

describe('add bookmark helpers', () => {
  it('adds https while typing only for domain-like values', () => {
    expect(normalizeBookmarkUrlInput('example.com')).toBe('https://example.com')
    expect(normalizeBookmarkUrlInput('example')).toBe('example')
    expect(normalizeBookmarkUrlInput('http://example.com')).toBe('http://example.com')
  })

  it('adds https before submit for values without a protocol', () => {
    expect(normalizeBookmarkUrlForSubmit(' example.com ')).toBe('https://example.com')
    expect(normalizeBookmarkUrlForSubmit('https://example.com ')).toBe('https://example.com')
  })

  it('recognizes the existing duplicate URL conflict message', () => {
    expect(isDuplicateURLConflict(new ConflictError(DUPLICATE_URL_MESSAGE))).toBe(true)
    expect(isDuplicateURLConflict(new ConflictError('different'))).toBe(false)
    expect(isDuplicateURLConflict(new Error(DUPLICATE_URL_MESSAGE))).toBe(false)
  })

  it('fills the title only when metadata returns a usable title', () => {
    expect(mergeFetchedBookmarkTitle('', 'Example title')).toBe('Example title')
    expect(mergeFetchedBookmarkTitle('', '')).toBe('')
    expect(mergeFetchedBookmarkTitle('', '   ')).toBe('')
    expect(mergeFetchedBookmarkTitle('Manual title', 'Example title')).toBe('Manual title')
  })

  it('treats empty metadata titles as missing titles', () => {
    expect(hasFetchedBookmarkTitle('Example title')).toBe(true)
    expect(hasFetchedBookmarkTitle('')).toBe(false)
    expect(hasFetchedBookmarkTitle('   ')).toBe(false)
    expect(hasFetchedBookmarkTitle(null)).toBe(false)
    expect(hasFetchedBookmarkTitle(undefined)).toBe(false)
  })
})
