import type { CollisionDetection } from '@dnd-kit/core'
import {
  computePlacement,
  getUnifiedSiblings,
  sortAfter,
  sortBefore,
  sortBetween,
  type SortableItem,
} from './sortKeys'

export const POINTER_SENSOR_CONFIG = { activationConstraint: { distance: 5 } } as const

export type UnifiedSortableItem = SortableItem

export { computePlacement, getUnifiedSiblings, sortAfter, sortBefore, sortBetween }

/** Collision detection: finds the droppable whose center is closest to the pointer. */
export function pointerClosestCenter(args: Parameters<CollisionDetection>[0]) {
  const { droppableContainers, pointerCoordinates } = args

  if (!pointerCoordinates) return []

  // Prefer droppables whose rect actually contains the pointer
  const within = droppableContainers.filter(c => {
    const r = c.rect.current
    return r && pointerCoordinates.x >= r.left && pointerCoordinates.x <= r.left + r.width
      && pointerCoordinates.y >= r.top && pointerCoordinates.y <= r.top + r.height
  })
  // If no rect contains the pointer, prefer droppables in the same column (X overlap)
  let candidates: typeof droppableContainers
  if (within.length > 0) {
    candidates = within
  } else {
    const xMatch = droppableContainers.filter(c => {
      const r = c.rect.current
      return r && pointerCoordinates.x >= r.left && pointerCoordinates.x <= r.left + r.width
    })
    candidates = xMatch.length > 0 ? xMatch : droppableContainers
  }

  let closestDistance = Infinity
  let closestId: string | null = null

  for (const container of candidates) {
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
