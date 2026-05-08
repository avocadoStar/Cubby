export interface SortableItem {
  id: string
  parentId: string | null
  sortKey: string
}

const MIN_SORT_BYTE = '!'.charCodeAt(0)
const MAX_SORT_BYTE = '~'.charCodeAt(0)

function isValidSortKey(key: string): boolean {
  for (let i = 0; i < key.length; i++) {
    const charCode = key.charCodeAt(i)
    if (charCode < MIN_SORT_BYTE || charCode > MAX_SORT_BYTE) {
      return false
    }
  }
  return true
}

// Mirrors backend/internal/service/lexorank.go so local optimistic order stays backend-compatible.
function between(prev: string, next: string): string {
  if (!isValidSortKey(prev) || (next !== '' && !isValidSortKey(next))) {
    return ''
  }
  if (next !== '' && prev >= next) {
    return ''
  }

  let left = prev
  let right = next
  let prefix = ''

  for (let i = 0; ; i++) {
    let prevByte = MIN_SORT_BYTE - 1
    if (i < left.length) {
      prevByte = left.charCodeAt(i)
    }

    let nextByte = MAX_SORT_BYTE + 1
    if (right !== '' && i < right.length) {
      nextByte = right.charCodeAt(i)
    }

    if (prevByte === nextByte) {
      prefix += String.fromCharCode(prevByte)
      continue
    }

    if (nextByte - prevByte > 1) {
      const mid = prevByte + Math.floor((nextByte - prevByte) / 2)
      return prefix + String.fromCharCode(mid)
    }

    if (i < left.length) {
      prefix += String.fromCharCode(prevByte)
      left = left.slice(i + 1)
      right = ''
      i = -1
      continue
    }

    if (right !== '' && i + 1 < right.length) {
      return right.slice(0, i + 1)
    }

    return ''
  }
}

export function sortAfter(key: string): string {
  if (!key) return 'n'
  return between(key, '')
}

export function sortBefore(key: string): string {
  if (!key) return 'a'
  return between('', key)
}

export function sortBetween(prev: string, next: string): string {
  if (!prev) return sortBefore(next)
  if (!next) return sortAfter(prev)
  return between(prev, next)
}

export function computeSortKeyFromNeighbors(
  prevKey: string | null | undefined,
  nextKey: string | null | undefined,
): string {
  if (prevKey && nextKey) return sortBetween(prevKey, nextKey)
  if (prevKey) return sortAfter(prevKey)
  if (nextKey) return sortBefore(nextKey)
  return sortAfter('')
}

export function getUnifiedSiblings(
  renderedItems: SortableItem[],
  fallbackItems: SortableItem[],
  parentId: string | null,
  excludeId: string,
): string[] {
  const renderedSiblings = renderedItems.filter((item) => item.parentId === parentId)
  const source = renderedSiblings.length > 0
    ? renderedSiblings
    : fallbackItems.filter((item) => item.parentId === parentId)

  return source
    .filter((item) => item.id !== excludeId)
    .sort((a, b) => {
      if (a.sortKey < b.sortKey) return -1
      if (a.sortKey > b.sortKey) return 1
      return a.id.localeCompare(b.id)
    })
    .map((item) => item.id)
}

export function computePlacement(list: string[], insertAt: number) {
  const index = Math.max(0, Math.min(insertAt, list.length))
  return {
    prevId: index > 0 ? list[index - 1] : null,
    nextId: index < list.length ? list[index] : null,
  }
}
