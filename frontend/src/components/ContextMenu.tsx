import { useState, useEffect, type CSSProperties } from 'react'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useContextMenu } from '../hooks/useContextMenu'
import { useContextActions } from '../hooks/useContextActions'
import EditBookmarkModal from './EditBookmarkModal'
import RenameFolderModal from './RenameFolderModal'

const MENU_BTN_STYLE: CSSProperties = { color: 'var(--app-text)' }
const MENU_BTN_HOVER_BG = 'var(--app-hover)'

function menuBtn(onClick: () => void, label: string, style?: CSSProperties) {
  return (
    <button className="block w-full text-left h-8 px-3 rounded text-body cursor-default"
      style={style ?? MENU_BTN_STYLE}
      onMouseEnter={e => { e.currentTarget.style.background = MENU_BTN_HOVER_BG }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      onClick={onClick}>
      {label}
    </button>
  )
}

function menuDivider() {
  return <div className="border-t my-0.5" style={{ borderColor: 'var(--divider-color)' }} />
}

export default function ContextMenu() {
  const { menu, target, menuRef, closeMenu } = useContextMenu()
  const { openUrl, handleCopyLink, handleDelete } = useContextActions(target, closeMenu)
  const [editingBookmark, setEditingBookmark] = useState<string | null>(null)
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)

  useEffect(() => {
    if (editingBookmark) {
      const bm = useBookmarkStore.getState().bookmarks.find(b => b.id === editingBookmark)
      if (!bm) setEditingBookmark(null)
    }
  }, [editingBookmark])

  if (!menu && !editingBookmark && !renamingFolder) return null

  const isBookmark = target?.type === 'bookmark'
  const targetId = target?.id

  return (
    <>
      {menu && (
        <div ref={menuRef} className="fixed z-[100] p-1 min-w-[200px]"
          style={{ left: menu.x, top: menu.y, background: 'var(--app-card)', border: 'var(--input-border)', borderRadius: 'var(--card-radius)', boxShadow: 'var(--shadow-lg)' }}>
          {isBookmark && (
            <>
              {menuBtn(() => { closeMenu(); if (targetId) setEditingBookmark(targetId) }, '编辑')}
              {menuBtn(handleCopyLink, '复制链接')}
              {menuDivider()}
              {menuBtn(() => openUrl('_blank'), '在新标签页中打开')}
              {menuBtn(() => openUrl('_blank', 'popup'), '在新窗口中打开')}
              {menuDivider()}
              {menuBtn(handleDelete, '删除', { color: 'var(--app-danger)' })}
            </>
          )}
          {!isBookmark && (
            <>
              {menuBtn(() => { closeMenu(); if (targetId) setRenamingFolder(targetId) }, '重命名')}
              {menuDivider()}
              {menuBtn(handleDelete, '删除', { color: 'var(--app-danger)' })}
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
