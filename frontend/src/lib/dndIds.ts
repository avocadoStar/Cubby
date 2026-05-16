// Centralized DnD ID composition and parsing for dnd-kit.
// All draggable/droppable ID string conventions live here.

// --- Draggable IDs ---

/** Compose a draggable ID: `"bookmark:abc"` or `"sidebar:abc"`. */
export function composeDraggableId(kind: 'bookmark' | 'sidebar', id: string): string {
  return `${kind}:${id}`
}

/** Parse a draggable ID into its kind and real ID. */
export function parseDraggableId(composite: string): { kind: 'bookmark' | 'sidebar' | 'folder'; id: string } {
  if (composite.startsWith('bookmark:')) return { kind: 'bookmark', id: composite.slice('bookmark:'.length) }
  if (composite.startsWith('sidebar:')) return { kind: 'sidebar', id: composite.slice('sidebar:'.length) }
  return { kind: 'folder', id: composite }
}

/** Strip the kind prefix from a draggable ID, returning just the real ID. */
export function stripDraggablePrefix(composite: string): string {
  if (composite.startsWith('bookmark:')) return composite.slice('bookmark:'.length)
  if (composite.startsWith('sidebar:')) return composite.slice('sidebar:'.length)
  return composite
}

/** Check if a draggable ID is a bookmark type. */
export function isBookmarkDragId(composite: string): boolean {
  return composite.startsWith('bookmark:')
}

// --- Droppable IDs ---

/** Compose a main-area droppable ID: `"droppable:abc"` or `"droppable:bookmark:abc"`. */
export function composeMainDroppableId(id: string, kind?: 'bookmark'): string {
  return kind ? `droppable:${kind}:${id}` : `droppable:${id}`
}

/** Compose a sidebar droppable ID: `"droppable:sidebar:abc"`. */
export function composeSidebarDroppableId(id: string): string {
  return `droppable:sidebar:${id}`
}

/** Parse a droppable ID, extracting the real target ID. */
export function parseDroppableId(composite: string): { source: 'main' | 'sidebar'; id: string } {
  if (composite.startsWith('droppable:sidebar:')) return { source: 'sidebar', id: composite.slice('droppable:sidebar:'.length) }
  if (composite.startsWith('droppable:bookmark:')) return { source: 'main', id: composite.slice('droppable:bookmark:'.length) }
  if (composite.startsWith('droppable:')) return { source: 'main', id: composite.slice('droppable:'.length) }
  return { source: 'main', id: composite }
}

/** Check if a droppable ID is a sidebar target. */
export function isSidebarDroppable(composite: string): boolean {
  return composite.startsWith('droppable:sidebar:')
}

/** Normalize a droppable overId by stripping droppable: prefix(es). */
export function normalizeOverId(overId: string): string {
  if (overId.startsWith('droppable:sidebar:')) return overId.slice('droppable:sidebar:'.length)
  if (overId.startsWith('droppable:')) return overId.slice('droppable:'.length)
  return overId
}
