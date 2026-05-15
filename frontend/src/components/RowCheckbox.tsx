interface RowCheckboxProps {
  checked: boolean
  ariaLabel: string
  onToggle: () => void
}

export default function RowCheckbox({ checked, ariaLabel, onToggle }: RowCheckboxProps) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      className="flex-shrink-0 mr-2.5 flex items-center justify-center cursor-pointer"
      style={{
        width: 18, height: 18,
        borderRadius: '50%',
        border: checked ? '2px solid var(--app-accent)' : 'var(--checkbox-border)',
        background: checked ? 'var(--app-accent)' : 'transparent',
      }}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
    >
      {checked && (
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-on-accent)" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  )
}
