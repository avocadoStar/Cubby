import { useState, useEffect, useRef } from 'react'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useContextMenu } from '../hooks/useContextMenu'
import { useContextActions } from '../hooks/useContextActions'
import { motionDurationMs, motionTransform, transitionFor } from '../lib/motion'
import EditBookmarkModal from './EditBookmarkModal'
import RenameFolderModal from './RenameFolderModal'

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function MenuBtn({ onClick, label, danger = false }: { onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      className="block w-full text-left h-8 px-3 rounded text-body cursor-pointer border-none bg-transparent hover:bg-app-hover"
      style={{ color: danger ? 'var(--app-danger)' : 'var(--app-text)' }}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function MenuDivider() {
  return <div className="border-t my-0.5" style={{ borderColor: 'var(--divider-color)' }} />
}

export default function ContextMenu() {
  const { menu, target, menuRef, closeMenu } = useContextMenu()
  const { openUrl, handleCopyLink, handleDelete } = useContextActions(target, closeMenu)
  const [editingBookmark, setEditingBookmark] = useState<string | null>(null)
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)

  const [localOpen, setLocalOpen] = useState(false)
  const [animated, setAnimated] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const rafRef = useRef<number | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (editingBookmark) {
      const bm = useBookmarkStore.getState().bookmarks.find(b => b.id === editingBookmark)
      if (!bm) setEditingBookmark(null)
    }
  }, [editingBookmark])

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      if (closeTimerRef.current != null) clearTimeout(closeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (menu) {
      setPos({ x: menu.x, y: menu.y })
      setLocalOpen(true)
      rafRef.current = requestAnimationFrame(() => setAnimated(true))
    } else if (localOpen) {
      setAnimated(false)
      closeTimerRef.current = setTimeout(() => {
        setLocalOpen(false)
        closeTimerRef.current = null
      }, prefersReducedMotion ? 0 : motionDurationMs.fast)
    }
  }, [menu])

  const closeWithAnimation = (fn?: () => void) => {
    setAnimated(false)
    setTimeout(() => {
      setLocalOpen(false)
      closeMenu()
      fn?.()
    }, prefersReducedMotion ? 0 : motionDurationMs.fast)
  }

  if (!localOpen && !editingBookmark && !renamingFolder) return null

  const isBookmark = target?.type === 'bookmark'
  const targetId = target?.id

  const menuTransition = [
    transitionFor('transform', animated ? 'fast' : 'exit', animated ? 'enter' : 'exit', prefersReducedMotion),
    transitionFor('opacity', animated ? 'fast' : 'exit', animated ? 'enter' : 'exit', prefersReducedMotion),
  ].join(', ')

  return (
    <>
      {localOpen && (
        <div
          ref={menuRef}
          className="fixed z-[100] p-1 min-w-[200px]"
          style={{
            left: pos.x,
            top: pos.y,
            background: 'var(--app-card)',
            border: 'var(--input-border)',
            borderRadius: 'var(--card-radius)',
            boxShadow: 'var(--shadow-lg)',
            transformOrigin: 'top left',
            transform: animated ? motionTransform.menu.open : motionTransform.menu.closed,
            opacity: animated ? 1 : 0,
            transition: menuTransition,
          }}
        >
          {isBookmark && (
            <>
              <MenuBtn onClick={() => closeWithAnimation(() => { if (targetId) setEditingBookmark(targetId) })} label="编辑" />
              <MenuBtn onClick={() => closeWithAnimation(handleCopyLink)} label="复制链接" />
              <MenuDivider />
              <MenuBtn onClick={() => closeWithAnimation(() => openUrl('_blank'))} label="在新标签页中打开" />
              <MenuBtn onClick={() => closeWithAnimation(() => openUrl('_blank', 'popup'))} label="在新窗口中打开" />
              <MenuDivider />
              <MenuBtn onClick={() => closeWithAnimation(handleDelete)} label="删除" danger />
            </>
          )}
          {!isBookmark && (
            <>
              <MenuBtn onClick={() => closeWithAnimation(() => { if (targetId) setRenamingFolder(targetId) })} label="重命名" />
              <MenuDivider />
              <MenuBtn onClick={() => closeWithAnimation(handleDelete)} label="删除" danger />
            </>
          )}
        </div>
      )}

      {editingBookmark && (() => {
        const bm = useBookmarkStore.getState().bookmarks.find(b => b.id === editingBookmark)
        if (!bm) return null
        return (
          <EditBookmarkModal
            bookmark={bm}
            onClose={() => setEditingBookmark(null)}
          />
        )
      })()}

      {renamingFolder && (
        <RenameFolderModal folderId={renamingFolder} onClose={() => setRenamingFolder(null)} />
      )}
    </>
  )
}
