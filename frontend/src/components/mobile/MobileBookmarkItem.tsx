import { useCallback, useRef, useState } from 'react'
import type { Bookmark } from '../../types'

const ACTION_WIDTH = 144

interface MobileBookmarkItemProps {
  bookmark: Bookmark
  isDeleting?: boolean
  onOpenNotes: () => void
  onDelete: () => void
}

export default function MobileBookmarkItem({ bookmark, isDeleting = false, onOpenNotes, onDelete }: MobileBookmarkItemProps) {
  const [offset, setOffset] = useState(0)
  const [snapping, setSnapping] = useState(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const offsetRef = useRef(0)
  const directionRef = useRef<'h' | 'v' | null>(null)
  const swipingRef = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isDeleting) return
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    offsetRef.current = 0
    directionRef.current = null
    swipingRef.current = false
    setSnapping(false)
  }, [isDeleting])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDeleting) return
    const dx = e.touches[0].clientX - startXRef.current
    const dy = e.touches[0].clientY - startYRef.current

    if (!directionRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      directionRef.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }

    if (directionRef.current === 'v') return
    if (directionRef.current === 'h') {
      e.preventDefault()
      swipingRef.current = true
      const newOffset = Math.min(0, Math.max(-ACTION_WIDTH, dx))
      offsetRef.current = newOffset
      setOffset(newOffset)
    }
  }, [isDeleting])

  const handleTouchEnd = useCallback(() => {
    if (isDeleting) return
    if (!swipingRef.current) { directionRef.current = null; return }
    swipingRef.current = false
    directionRef.current = null
    setSnapping(true)
    if (offsetRef.current < -ACTION_WIDTH * 0.35) {
      setOffset(-ACTION_WIDTH)
      offsetRef.current = -ACTION_WIDTH
    } else {
      setOffset(0)
      offsetRef.current = 0
    }
  }, [isDeleting])

  // Mouse events for desktop testing
  const mouseDownRef = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isDeleting) return
    mouseDownRef.current = true
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    offsetRef.current = offset
    directionRef.current = null
    swipingRef.current = false
    setSnapping(false)
    e.preventDefault()
  }, [isDeleting, offset])

  const closeSwipe = useCallback(() => {
    setSnapping(true)
    setOffset(0)
    offsetRef.current = 0
    swipingRef.current = false
    directionRef.current = null
  }, [])

  const handleOpenNotes = useCallback(() => {
    if (isDeleting) return
    closeSwipe()
    onOpenNotes()
  }, [closeSwipe, isDeleting, onOpenNotes])

  const handleDelete = useCallback(() => {
    if (isDeleting) return
    closeSwipe()
    onDelete()
  }, [closeSwipe, isDeleting, onDelete])

  return (
    <div
      data-deleting={isDeleting ? 'true' : undefined}
      className="bookmark-delete-motion"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--app-card)',
        borderBottom: '1px solid var(--divider-color)',
        opacity: isDeleting ? 0 : 1,
        transform: isDeleting ? 'translateX(10px) scale(0.985)' : 'translateX(0) scale(1)',
        transition: 'opacity 0.22s ease-out, transform 0.22s ease-out',
        pointerEvents: isDeleting ? 'none' : undefined,
      }}
    >
      {/* Action buttons */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        display: 'flex', zIndex: 1,
      }}>
        <button disabled={isDeleting} onClick={handleOpenNotes} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 2, width: 72, height: '100%', border: 'none', cursor: 'pointer',
          fontSize: 10, fontWeight: 500, color: '#fff', background: '#8B5CF6',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span>笔记</span>
        </button>
        <button disabled={isDeleting} onClick={handleDelete} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 2, width: 72, height: '100%', border: 'none', cursor: 'pointer',
          fontSize: 10, fontWeight: 500, color: '#fff', background: 'var(--app-danger)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span>删除</span>
        </button>
      </div>

      {/* Content — single row matching folder height */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        style={{
          position: 'relative', zIndex: 2, background: 'var(--app-card)',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px',
          transform: `translateX(${offset}px)`,
          transition: snapping ? 'transform 0.2s ease' : 'none',
          willChange: 'transform',
          touchAction: 'pan-y',
          cursor: 'pointer',
        }}
      >
        {bookmark.icon ? (
          <img src={bookmark.icon} alt="" style={{ width: 18, height: 18, borderRadius: 3, flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <div style={{
            width: 18, height: 18, borderRadius: 3, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, background: 'var(--accent-light, #EFF6FF)',
            color: 'var(--app-accent)', fontWeight: 700,
          }}>{bookmark.title.charAt(0).toUpperCase()}</div>
        )}
        <span style={{
          flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--app-text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{bookmark.title}</span>
        {bookmark.notes && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )}
      </div>
    </div>
  )
}
