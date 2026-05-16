import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface SidePanelFrameProps {
  open: boolean
  width: number
  resizing?: boolean
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  onClose: () => void
}

export default function SidePanelFrame({
  open,
  width,
  resizing = false,
  title,
  subtitle,
  actions,
  children,
  onClose,
}: SidePanelFrameProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  return (
    <aside
      aria-hidden={!open}
      className="overflow-hidden bg-app-card shrink-0"
      style={{
        width: open ? width : 0,
        borderLeft: open ? '1px solid var(--app-border)' : '1px solid transparent',
        boxShadow: open ? 'var(--shadow)' : 'none',
        transition: resizing ? 'border-color 0.2s, box-shadow 0.2s' : 'width 0.2s ease-out, border-color 0.2s, box-shadow 0.2s',
      }}
    >
      <div
        className="flex flex-col h-full relative overflow-hidden"
        style={{
          width,
          opacity: open ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        <div className="shrink-0 flex items-start justify-between gap-2 p-3 border-b border-app-border">
          <div className="min-w-0">
            {title && (
              <div className="truncate text-[var(--fs-0)] font-semibold leading-tight text-app-text">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="truncate text-[var(--fs--1)] text-app-text2 mt-0.5 select-all">
                {subtitle}
              </div>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-1">
            {actions}
            <button
              type="button"
              aria-label="Close side panel"
              onClick={onClose}
              className="w-8 h-8 inline-flex items-center justify-center rounded-button shrink-0 cursor-pointer text-app-text2 bg-app-card border border-input-border shadow-app-sm hover:bg-app-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--app-accent)]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </aside>
  )
}
