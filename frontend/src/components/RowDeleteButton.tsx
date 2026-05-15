interface RowDeleteButtonProps {
  hovered: boolean
  ariaLabel: string
  onDelete: () => void
}

export default function RowDeleteButton({ hovered, ariaLabel, onDelete }: RowDeleteButtonProps) {
  return (
    <div
      role="button"
      aria-label={ariaLabel}
      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded cursor-pointer"
      style={{ opacity: hovered ? 1 : 0.35, color: hovered ? 'var(--app-danger)' : 'var(--app-text3)' }}
      onClick={(e) => { e.stopPropagation(); onDelete() }}
    >
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </div>
  )
}
