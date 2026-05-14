import { describe, expect, it } from 'vitest'
import { ConflictError } from '../services/api'
import {
  DUPLICATE_URL_MESSAGE,
  isDuplicateURLConflict,
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
})
