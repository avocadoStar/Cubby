import { type ReactNode } from 'react'

interface ModalBaseProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function ModalBase({ title, onClose, children }: ModalBaseProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay"
      onClick={onClose}
    >
      <div
        className="w-[min(92vw,420px)] bg-app-card border border-app-border rounded-card shadow-app-lg p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-title font-semibold mb-5 text-app-text">{title}</h3>
        {children}
      </div>
    </div>
  )
}
