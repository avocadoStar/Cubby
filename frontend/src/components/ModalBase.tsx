import { type ReactNode, useEffect } from 'react'

interface ModalBaseProps {
  title: string
  onClose: () => void | Promise<void>
  children: ReactNode
  width?: string
  closeOnEscape?: boolean
  closeOnOverlayClick?: boolean
}

export default function ModalBase({
  title,
  onClose,
  children,
  width = '360px',
  closeOnEscape = false,
  closeOnOverlayClick = true,
}: ModalBaseProps) {
  useEffect(() => {
    if (!closeOnEscape) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      void onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeOnEscape, onClose])

  const handleOverlayClick = () => {
    if (!closeOnOverlayClick) return
    void onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-app-card border border-app-border rounded-card shadow-app-lg p-6"
        style={{ width: `min(92vw, ${width})` }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold mb-4 text-app-text">{title}</h3>
        {children}
      </div>
    </div>
  )
}

