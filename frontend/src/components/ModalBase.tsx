import { type ReactNode } from 'react'

interface ModalBaseProps {
  title: string
  onClose: () => void
  children: ReactNode
  width?: string
}

export default function ModalBase({ title, onClose, children, width = '360px' }: ModalBaseProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay"
      onClick={onClose}
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

