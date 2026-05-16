import { useCallback, useRef, useState } from 'react'
import { FileText, Trash2 } from 'lucide-react'
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
      className="bookmark-delete-motion relative overflow-hidden bg-app-card"
      style={{
        opacity: isDeleting ? 0 : 1,
        transform: isDeleting ? 'translateX(10px) scale(0.985)' : 'translateX(0) scale(1)',
        transition: 'opacity 0.22s ease-out, transform 0.22s ease-out',
        pointerEvents: isDeleting ? 'none' : undefined,
      }}
    >
      {/* Action buttons */}
      <div className="absolute top-0 right-0 bottom-0 flex z-1">
        <button disabled={isDeleting} onClick={handleOpenNotes}
          className="flex flex-col items-center justify-center gap-0.5 w-[72px] h-full border-none cursor-pointer text-[10px] font-medium text-white bg-app-accent">
          <FileText size={16} strokeWidth={2} />
          <span>笔记</span>
        </button>
        <button disabled={isDeleting} onClick={handleDelete}
          className="flex flex-col items-center justify-center gap-0.5 w-[72px] h-full border-none cursor-pointer text-[10px] font-medium text-white bg-app-danger">
          <Trash2 size={16} strokeWidth={2} />
          <span>删除</span>
        </button>
      </div>

      {/* Content — single row matching folder height */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        className="relative z-2 bg-app-card flex items-center gap-2 py-3 px-4 cursor-pointer"
        style={{
          transform: `translateX(${offset}px)`,
          transition: snapping ? 'transform 0.2s ease' : 'none',
          willChange: 'transform',
          touchAction: 'pan-y',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          boxShadow: '0 1px 0 0 var(--app-card)',
        }}
      >
        {bookmark.icon ? (
          <img src={bookmark.icon} alt="" className="w-[18px] h-[18px] rounded-[var(--radius-xs)] shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <div className="w-[18px] h-[18px] rounded-[var(--radius-xs)] shrink-0 flex items-center justify-center text-[11px] bg-accent-light text-app-accent font-bold">
            {bookmark.title.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="flex-1 text-sm font-medium text-app-text truncate">{bookmark.title}</span>
        {bookmark.notes && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--app-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )}
      </div>

      {/* Divider on top of all layers to avoid compositing gap bleed-through */}
      <div className="absolute bottom-0 left-0 right-0 z-3 pointer-events-none"
        style={{ height: '1px', background: 'var(--divider-color)' }} />
    </div>
  )
}
