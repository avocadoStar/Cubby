import { ConflictError } from '../services/apiErrors'

export const DUPLICATE_URL_MESSAGE = '已存在'

export function normalizeBookmarkUrlInput(value: string): string {
  return value && !/^https?:\/\//i.test(value) && value.includes('.')
    ? 'https://' + value
    : value
}

export function normalizeBookmarkUrlForSubmit(value: string): string {
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed
}

export function hasFetchedBookmarkTitle(title: string | null | undefined): boolean {
  return Boolean(title?.trim())
}

export function mergeFetchedBookmarkTitle(currentTitle: string, fetchedTitle: string | null | undefined): string {
  return currentTitle.trim() || !hasFetchedBookmarkTitle(fetchedTitle)
    ? currentTitle
    : fetchedTitle ?? ''
}

export function isDuplicateURLConflict(error: unknown): boolean {
  return error instanceof ConflictError && error.message === DUPLICATE_URL_MESSAGE
}
