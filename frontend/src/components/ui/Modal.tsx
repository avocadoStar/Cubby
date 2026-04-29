import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

type ModalProps = {
  children: ReactNode
  contentClassName?: string
  dismissible?: boolean
  onClose: () => void
  open: boolean
  panelClassName?: string
  title: string
  width?: 'md' | 'lg'
}

const widthClasses = {
  md: 'max-w-[40rem]',
  lg: 'max-w-[52rem]',
}

export function Modal({
  children,
  contentClassName = '',
  dismissible = true,
  onClose,
  open,
  panelClassName = '',
  title,
  width = 'md',
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (dismissible && event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    const currentContainer = containerRef.current
    const firstFocusable = currentContainer?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    firstFocusable?.focus()

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [dismissible, onClose, open])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4 py-5 sm:px-6"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={dismissible ? onClose : undefined}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            aria-label={title}
            aria-modal="true"
            className={`surface-elevated flex max-h-[calc(100vh-2.5rem)] w-full min-h-0 flex-col ${widthClasses[width]} overflow-hidden p-4 sm:p-5 ${panelClassName}`.trim()}
            exit={{ opacity: 0, y: 8 }}
            initial={{ opacity: 0, y: 8 }}
            onClick={(event) => event.stopPropagation()}
            ref={containerRef}
            role="dialog"
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="mb-4 flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
              <div className="min-w-0">
                <h2 className="truncate text-[16px] font-semibold text-[var(--color-text)]">{title}</h2>
              </div>
              {dismissible ? (
                <button aria-label="关闭弹窗" className="icon-button shrink-0" onClick={onClose} type="button">
                  <Icon className="text-[15px]" name="close" />
                </button>
              ) : null}
            </div>
            <div className={`min-h-0 flex-1 ${contentClassName}`.trim()}>{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
