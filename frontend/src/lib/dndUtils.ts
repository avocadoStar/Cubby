import type { CollisionDetection } from '@dnd-kit/core'

export const POINTER_SENSOR_CONFIG = { activationConstraint: { distance: 5 } } as const

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

// Mirrors backend/internal/service/lexorank.go so cross-type drag keys remain backend-compatible.
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

/** Collision detection: finds the droppable whose center is closest to the pointer. */
export function pointerClosestCenter(args: Parameters<CollisionDetection>[0]) {
  const { droppableContainers, pointerCoordinates } = args

  if (!pointerCoordinates) return []

  let closestDistance = Infinity
  let closestId: string | null = null

  for (const container of droppableContainers) {
    const rect = container.rect.current
    if (!rect) continue

    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = pointerCoordinates.x - centerX
    const dy = pointerCoordinates.y - centerY
    const distance = dx * dx + dy * dy

    if (distance < closestDistance) {
      closestDistance = distance
      closestId = container.id as string
    }
  }

  return closestId ? [{ id: closestId }] : []
}

/** Determine drop position based on pointer Y relative to element rect. */
export function calcDropPosition(
  rect: DOMRect,
  pointerY: number,
): 'before' | 'inside' | 'after' {
  const relY = pointerY - rect.top
  const h = rect.height
  if (relY < h * 0.3) return 'before'
  if (relY > h * 0.7) return 'after'
  return 'inside'
}
