import type { CSSProperties } from 'react'

export interface RowStyleParams {
  isDragging?: boolean
  isDeleting?: boolean
  isSelected?: boolean
  isOverInside?: boolean
  isRecentlyChanged?: boolean
  hovered?: boolean
  cardBg?: string
  hoverBg?: string
  rowShadow?: string
  hoverShadow?: string
}

export function getRowStyles(params: RowStyleParams): CSSProperties {
  const {
    isDragging = false,
    isDeleting = false,
    isSelected = false,
    isOverInside = false,
    isRecentlyChanged = false,
    hovered = false,
    cardBg = 'var(--app-card)',
    hoverBg = 'var(--app-hover)',
    rowShadow = 'var(--row-shadow)',
    hoverShadow = 'var(--card-shadow-hover)',
  } = params

  return {
    opacity: isDeleting ? 0 : isDragging ? 0.3 : 1,
    background: isOverInside ? 'var(--accent-light)'
      : isSelected ? 'var(--accent-light)'
      : isRecentlyChanged ? 'var(--accent-light)'
      : hovered ? hoverBg
      : cardBg,
    boxShadow: isSelected || isOverInside ? 'var(--input-shadow)' : hovered ? hoverShadow : rowShadow,
    outline: isOverInside ? '1px solid var(--app-accent)' : undefined,
  }
}
