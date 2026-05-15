import { type ReactNode, useEffect, useRef, useState } from 'react'

interface ModalBaseProps {
  title: string
  onClose: () => void | Promise<void>
  children: ReactNode
  width?: string
  closeOnEscape?: boolean
  closeOnOverlayClick?: boolean
}

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function ModalBase({
  title,
  onClose,
  children,
  width = '360px',
  closeOnEscape = true,
  closeOnOverlayClick = true,
}: ModalBaseProps) {
  const [visible, setVisible] = useState(false)
  const closingRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => setVisible(true))
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const close = () => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    setTimeout(() => void onClose(), prefersReducedMotion ? 0 : 200)
  }

  const handleOverlayClick = () => {
    if (!closeOnOverlayClick) return
    close()
  }

  useEffect(() => {
    if (!closeOnEscape) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      close()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeOnEscape, onClose])

  const transition = prefersReducedMotion ? 'none' : `opacity var(--motion-duration-normal) var(--motion-easing-standard)`
  const cardTransition = prefersReducedMotion ? 'none' : `transform var(--motion-duration-normal) var(--motion-easing-enter), opacity var(--motion-duration-normal) var(--motion-easing-enter)`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'var(--overlay)',
        opacity: visible ? 1 : 0,
        transition,
      }}
      onClick={handleOverlayClick}
    >
      <div
        className="bg-app-card border border-app-border rounded-card shadow-app-lg p-6"
        style={{
          width: `min(92vw, ${width})`,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(4px)',
          opacity: visible ? 1 : 0,
          transition: cardTransition,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold mb-4 text-app-text">{title}</h3>
        {children}
      </div>
    </div>
  )
}
