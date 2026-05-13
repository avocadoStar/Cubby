import { useEffect, useRef, useState } from 'react'
import type { Bookmark } from '../../types'
import { useBookmarkStore } from '../../stores/bookmarkStore'

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
    setTimeout(onClose, 250)
  }

  if (!bookmark) return null

  return (
    <>
      {/* Overlay */}
      <div onClick={handleClose} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.4)', zIndex: 70,
        opacity: open ? 1 : 0, transition: 'opacity 0.25s ease',
        pointerEvents: open ? 'auto' : 'none',
      }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        zIndex: 71,
        background: 'var(--app-card)',
        borderTopLeftRadius: 16, borderTopRightRadius: 16,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.25s ease',
        height: '60vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle */}
        <div onClick={handleClose} style={{
          display: 'flex', justifyContent: 'center', padding: '8px 0 4px', cursor: 'pointer',
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'var(--app-border)',
          }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 16px 8px', borderBottom: '1px solid var(--divider-color)',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--app-text)' }}>
            笔记
          </span>
          <button onClick={handleClose} style={{
            border: 'none', background: 'none', fontSize: 13,
            color: 'var(--app-accent)', cursor: 'pointer', fontWeight: 500,
          }}>完成</button>
        </div>

        {/* Bookmark title */}
        <div style={{
          padding: '8px 16px', fontSize: 12, color: 'var(--app-text3)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          borderBottom: '1px solid var(--divider-color)',
        }}>
          {bookmark.title}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={e => handleChange(e.target.value)}
          placeholder="添加笔记..."
          style={{
            flex: 1, padding: 12, border: 'none', outline: 'none',
            fontSize: 14, lineHeight: 1.6, resize: 'none',
            background: 'var(--app-card)', color: 'var(--app-text)',
          }}
        />
      </div>
    </>
  )
}
