import type { CollisionDetection } from '@dnd-kit/core'

export const POINTER_SENSOR_CONFIG = { activationConstraint: { distance: 5 } } as const

// Simple LexoRank helpers for computing sort keys client-side.
// Used when a bookmark is dropped relative to a folder (separate sort-key spaces).

export function sortAfter(key: string): string {
  if (!key) return 'n'
  return key + 'n'
}

export function sortBefore(key: string): string {
  if (!key) return 'a'
  const last = key.charCodeAt(key.length - 1)
  if (last > 97 /* 'a' */) {
    return key.slice(0, -1) + String.fromCharCode(last - 1) + 'n'
  }
  return key + 'a'
}

export function sortBetween(prev: string, next: string): string {
  if (!prev) return sortBefore(next)
  if (!next) return sortAfter(prev)
  const minLen = Math.min(prev.length, next.length)
  let i = 0
  for (; i < minLen && prev[i] === next[i]; i++) { /* find first diff */ }
  if (i === minLen) return prev + 'a'
  const pc = prev.charCodeAt(i)
  const nc = next.charCodeAt(i)
  if (nc - pc > 1) return prev.slice(0, i) + String.fromCharCode(pc + Math.floor((nc - pc) / 2))
  return prev.slice(0, i) + String.fromCharCode(pc) + 'n'
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
