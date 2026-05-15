import { useCallback, useState, useRef, useEffect } from 'react'
import ImportModal from './ImportModal'
import { api } from '../services/api'
import { motionDurationMs, motionTransform, transitionFor } from '../lib/motion'
import { useToastStore } from '../stores/toastStore'

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function MoreMenu() {
  const [open, setOpen] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [animated, setAnimated] = useState(false)
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  const closeMenu = useCallback(() => {
    setAnimated(false)
    setTimeout(() => {
      setMounted(false)
      setOpen(false)
    }, prefersReducedMotion ? 0 : motionDurationMs.fast)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeMenu()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [closeMenu])

  const toggle = () => {
    if (!open) {
      setMounted(true)
      setOpen(true)
      rafRef.current = requestAnimationFrame(() => setAnimated(true))
    } else {
      closeMenu()
    }
  }

  const handleTransitionEnd = () => {
    if (!animated && !open) setMounted(false)
  }

  const menuTransition = [
    transitionFor('transform', animated ? 'fast' : 'exit', animated ? 'enter' : 'exit', prefersReducedMotion),
    transitionFor('opacity', animated ? 'fast' : 'exit', animated ? 'enter' : 'exit', prefersReducedMotion),
  ].join(', ')

  return (
    <>
      <div ref={ref} className="relative">
        <button
          className="inline-flex items-center justify-center w-8 h-8 border-none rounded bg-transparent cursor-pointer hover:bg-app-hover"
          style={{ color: 'var(--app-text)' }}
          onClick={toggle}
          title="更多选项"
        >
          <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
            <circle cx="10" cy="5.5" r="1.25" /><circle cx="10" cy="10" r="1.25" /><circle cx="10" cy="14.5" r="1.25" />
          </svg>
        </button>
        {mounted && (
          <div
            onTransitionEnd={handleTransitionEnd}
            className="absolute right-0 top-10 w-[180px] p-1 z-50"
            style={{
              background: 'var(--app-card)',
              border: 'var(--input-border)',
              borderRadius: 'var(--card-radius)',
              boxShadow: 'var(--shadow-lg)',
              transformOrigin: 'top right',
              transform: animated ? motionTransform.menu.open : motionTransform.menu.closed,
              opacity: animated ? 1 : 0,
              transition: menuTransition,
            }}
          >
            <button
              className="flex items-center gap-2 w-full h-9 px-2.5 rounded text-body cursor-pointer border-none bg-transparent hover:bg-app-hover"
              style={{ color: 'var(--app-text)' }}
              onClick={() => { setShowImport(true); closeMenu() }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              <span>导入收藏夹</span>
            </button>
            <button
              className="flex items-center gap-2 w-full h-9 px-2.5 rounded text-body cursor-pointer border-none bg-transparent hover:bg-app-hover"
              style={{ color: 'var(--app-text)' }}
              onClick={async () => {
                try {
                  const blob = await api.exportBookmarks()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = 'bookmarks.html'; a.click()
                  URL.revokeObjectURL(url)
                  closeMenu()
                } catch (e) {
                  useToastStore.getState().show({
                    message: e instanceof Error && e.message ? e.message : 'Export failed, please try again',
                  })
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              <span>导出收藏夹</span>
            </button>
          </div>
        )}
      </div>
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </>
  )
}
