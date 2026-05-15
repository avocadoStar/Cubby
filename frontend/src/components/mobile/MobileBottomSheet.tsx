import { useEffect, useRef, useState } from 'react'
import type { Bookmark } from '../../types'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { motionDurationMs, motionTransform, overlayOpacity, transitionFor } from '../../lib/motion'

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function MobileBottomSheet({ bookmark, onClose }: {
  bookmark: Bookmark | null
  onClose: () => void
}) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const notesRef = useRef('')
  const updateNotes = useBookmarkStore(s => s.updateNotes)

  useEffect(() => {
    if (bookmark) {
      const nextNotes = bookmark.notes || ''
      setNotes(nextNotes)
      notesRef.current = nextNotes
      // Trigger animation on next frame
      requestAnimationFrame(() => setOpen(true))
    } else {
      setOpen(false)
    }
  }, [bookmark])

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus({ preventScroll: true })
    }
  }, [open])

  const handleChange = (value: string) => {
    setNotes(value)
    notesRef.current = value
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (bookmark) updateNotes(bookmark.id, value).catch(() => {})
    }, 500)
  }

  const handleClose = () => {
    setOpen(false)
    clearTimeout(timerRef.current)
    if (bookmark && notesRef.current !== (bookmark.notes || '')) {
      updateNotes(bookmark.id, notesRef.current).catch(() => {})
    }
    setTimeout(onClose, prefersReducedMotion ? 0 : motionDurationMs.normal)
  }

  if (!bookmark) return null

  return (
    <>
      {/* Overlay */}
      <div onClick={handleClose} className="fixed inset-0 z-[70]" style={{
        background: `rgba(0,0,0,${overlayOpacity.mobileScrim})`,
        opacity: open ? 1 : 0,
        transition: transitionFor('opacity', open ? 'normal' : 'exit', open ? 'standard' : 'exit', prefersReducedMotion),
        pointerEvents: open ? 'auto' : 'none',
      }} />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[71] bg-app-card rounded-t-[var(--radius-xl)] shadow-app-lg h-[60vh] flex flex-col" style={{
        transform: open ? motionTransform.bottomSheet.open : motionTransform.bottomSheet.closed,
        transition: transitionFor('transform', open ? 'normal' : 'exit', open ? 'enter' : 'exit', prefersReducedMotion),
      }}>
        {/* Handle */}
        <div onClick={handleClose} className="flex justify-center pt-2 pb-1 cursor-pointer">
          <div className="w-9 h-1 rounded-[var(--radius-pill)] bg-app-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-1 pb-2 border-b border-divider">
          <span className="text-sm font-semibold text-app-text">
            笔记
          </span>
          <button onClick={handleClose} className="border-none bg-transparent text-[13px] text-app-accent cursor-pointer font-medium">完成</button>
        </div>

        {/* Bookmark title */}
        <div className="px-4 py-2 text-xs text-[var(--app-text3)] whitespace-nowrap overflow-hidden text-ellipsis border-b border-divider">
          {bookmark.title}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={e => handleChange(e.target.value)}
          placeholder="添加笔记..."
          className="flex-1 p-3 border-none outline-none text-sm leading-[1.6] resize-none bg-app-card text-app-text"
        />
      </div>
    </>
  )
}
