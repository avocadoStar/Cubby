import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type ModalProps = {
  children: ReactNode
  onClose: () => void
  open: boolean
  title: string
  width?: 'md' | 'lg'
}

const widthClasses = {
  md: 'max-w-xl',
  lg: 'max-w-2xl',
}

export function Modal({ children, onClose, open, title, width = 'md' }: ModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-xl"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`glass-panel glass-panel-elevated w-full ${widthClasses[width]} overflow-hidden rounded-[28px] p-6 shadow-modal`.trim()}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            onClick={(event) => event.stopPropagation()}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{title}</h2>
              </div>
              <button className="icon-button" onClick={onClose} type="button">
                <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
                  <path d="M18 6 6 18" stroke="currentColor" strokeWidth="2" />
                  <path d="m6 6 12 12" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
