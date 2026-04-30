export const bookmarkDropTargetSelector = '[data-bookmark-drop-target]'

export type BookmarkSidebarDropTarget = {
  element: HTMLElement
  folderId: string | null
}

export function resolveSidebarDropTarget(
  rect: { height: number; left: number; top: number; width: number } | null,
): BookmarkSidebarDropTarget | null {
  if (!rect) {
    return null
  }

  const pointerX = rect.left + rect.width / 2
  const pointerY = rect.top + rect.height / 2
  const targetElement = document.elementFromPoint(pointerX, pointerY)?.closest<HTMLElement>(bookmarkDropTargetSelector)

  if (!targetElement) {
    return null
  }

  if (targetElement.dataset.bookmarkDropTarget === 'unsorted') {
    return { element: targetElement, folderId: null }
  }

  if (targetElement.dataset.bookmarkDropTarget === 'folder' && targetElement.dataset.folderId) {
    return { element: targetElement, folderId: targetElement.dataset.folderId }
  }

  return null
}

export function applySidebarDropHighlight(
  highlightedSidebarTargetRef: { current: HTMLElement | null },
  element: HTMLElement | null,
) {
  if (highlightedSidebarTargetRef.current === element) {
    return
  }

  if (highlightedSidebarTargetRef.current) {
    delete highlightedSidebarTargetRef.current.dataset.dndActive
  }

  highlightedSidebarTargetRef.current = element

  if (element) {
    element.dataset.dndActive = 'true'
  }
}

export function clearSidebarDropHighlight(highlightedSidebarTargetRef: { current: HTMLElement | null }) {
  if (highlightedSidebarTargetRef.current) {
    delete highlightedSidebarTargetRef.current.dataset.dndActive
    highlightedSidebarTargetRef.current = null
  }
}
