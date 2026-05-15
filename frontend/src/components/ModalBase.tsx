import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { motionDurationMs, motionTransform, transitionFor } from '../lib/motion'

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

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

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
  const cardRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement
    rafRef.current = requestAnimationFrame(() => {
      setVisible(true)
      const first = cardRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    })
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      previousFocusRef.current?.focus()
    }
  }, [])

  const close = () => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    setTimeout(() => void onClose(), prefersReducedMotion ? 0 : motionDurationMs.exit)
  }

  const handleOverlayClick = () => {
    if (!closeOnOverlayClick) return
    close()
  }

  const handleTabTrap = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const focusable = cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleTabTrap)
    return () => document.removeEventListener('keydown', handleTabTrap)
  }, [handleTabTrap])

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

  const transition = transitionFor('opacity', visible ? 'normal' : 'exit', visible ? 'standard' : 'exit', prefersReducedMotion)
  const cardTransition = [
    transitionFor('transform', visible ? 'normal' : 'exit', visible ? 'enter' : 'exit', prefersReducedMotion),
    transitionFor('opacity', visible ? 'normal' : 'exit', visible ? 'enter' : 'exit', prefersReducedMotion),
  ].join(', ')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'var(--overlay)',
        opacity: visible ? 1 : 0,
        transition,
      }}
      onClick={handleOverlayClick}
    >
      <div
        ref={cardRef}
        className="cubby-modal-card bg-app-card border border-app-border rounded-card shadow-app-lg p-6"
        style={{
          width: `min(92vw, ${width})`,
          transform: visible ? motionTransform.modal.open : motionTransform.modal.closed,
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
