import type { ReactNode } from 'react'

type TooltipProps = {
  children: ReactNode
  label: string
}

export function Tooltip({ children, label }: TooltipProps) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] leading-4 text-[var(--color-text)] opacity-0 shadow-[var(--shadow-elevated)] transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100">
        {label}
      </span>
    </span>
  )
}
