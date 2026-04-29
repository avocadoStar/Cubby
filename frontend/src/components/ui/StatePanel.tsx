import type { ReactNode } from 'react'
import { LogoMark } from './LogoMark'
import { Surface } from './Surface'

type StatePanelProps = {
  action?: ReactNode
  description: string
  title: string
}

export function StatePanel({ action, description, title }: StatePanelProps) {
  return (
    <Surface className="flex flex-col items-center justify-center gap-4 px-6 py-10 text-center" tone="panel">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-muted)] text-[var(--color-accent)]">
        <LogoMark className="h-8 w-8" compact />
      </span>
      <div className="space-y-2">
        <div className="text-[16px] font-semibold text-[var(--color-text)]">{title}</div>
        <p className="max-w-xl text-[13px] leading-5 text-[var(--color-text-secondary)]">{description}</p>
      </div>
      {action}
    </Surface>
  )
}
