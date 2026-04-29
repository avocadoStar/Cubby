import type { ReactNode } from 'react'
import { Tooltip } from '../ui/Tooltip'

type BookmarkActionButtonProps = {
  children: ReactNode
  label: string
  onClick: () => void
}

export function BookmarkActionButton({ children, label, onClick }: BookmarkActionButtonProps) {
  return (
    <Tooltip label={label}>
      <button aria-label={label} className="icon-button" onClick={onClick} type="button">
        {children}
      </button>
    </Tooltip>
  )
}
