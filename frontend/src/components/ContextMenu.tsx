import { useState, useEffect, useCallback, useRef } from 'react'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useFolderStore } from '../stores/folderStore'
import { api } from '../services/api'
import EditBookmarkModal from './EditBookmarkModal'

const MENU_BTN_STYLE: React.CSSProperties = { color: 'var(--app-text)' }
const MENU_BTN_HOVER_BG = 'var(--app-hover)'

interface Target {
  id: string
  type: 'bookmark' | 'folder'
}

export default function ContextMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [target, setTarget] = useState<Target | null>(null)
  const [editingBookmark, setEditingBookmark] = useState<string | null>(null)
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [folderName, setFolderName] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = useCallback((e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest('[data-context]') as HTMLElement | null
    if (el) {
      e.preventDefault()
      const id = el.dataset.id!
      const type = el.dataset.context as 'bookmark' | 'folder'
      setTarget({ id, type })
      setMenu({ x: e.clientX, y: e.clientY })
    }
  }, [])

  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu)
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null)
      }
    }
    document.addEventListener('mousedown', close)
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('mousedown', close)
    }
  }, [handleContextMenu])

  // Clean up stale editingBookmark reference
  useEffect(() => {
    if (editingBookmark) {
      const bm = useBookmarkStore.getState().bookmarks.find(b => b.id === editingBookmark)
      if (!bm) setEditingBookmark(null)
    }
  }, [editingBookmark])

  if (!menu && !editingBookmark && !renamingFolder) return null

  const isBookmark = target?.type === 'bookmark'
  const targetId = target?.id

  const getBookmark = () => targetId ? useBookmarkStore.getState().bookmarks.find(b => b.id === targetId) : undefined
  const getFolder = () => targetId ? useFolderStore.getState().folderMap.get(targetId) : undefined

  const closeMenu = () => setMenu(null)

  const openUrl = (windowTarget: string, features?: string) => {
    const bm = getBookmark()
    if (bm) window.open(bm.url, windowTarget, features)
    closeMenu()
  }

  const handleCopyLink = async () => {
    const bm = getBookmark()
    if (bm) {
      try {
        await navigator.clipboard.writeText(bm.url)
      } catch {
        const input = document.createElement('input')
        input.value = bm.url
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
    }
    closeMenu()
  }

  const handleDelete = async () => {
    if (!targetId) return
    const folderStore = useFolderStore.getState()
    if (isBookmark) {
      await api.deleteBookmark(targetId)
      useBookmarkStore.getState().load(folderStore.selectedId)
    } else {
      const folder = folderStore.folderMap.get(targetId)
      const parentId = folder?.parent_id ?? null
      await api.deleteFolder(targetId)
      await folderStore.loadChildren(parentId)
      await folderStore.loadChildren(null)
      if (folderStore.selectedId === targetId) {
        folderStore.select(parentId)
      }
    }
    closeMenu()
  }

  const handleRename = () => {
    closeMenu()
    const folder = getFolder()
    if (folder && targetId) {
      setFolderName(folder.name)
      setRenamingFolder(targetId)
    }
  }

  const submitRename = async () => {
    if (!folderName.trim() || !renamingFolder) return
    const folder = useFolderStore.getState().folderMap.get(renamingFolder)
    if (folder) {
      await api.updateFolder(renamingFolder, folderName.trim(), folder.version)
      await useFolderStore.getState().loadChildren(folder.parent_id)
    }
    setRenamingFolder(null)
    setFolderName('')
  }

  const menuBtnStyle = MENU_BTN_STYLE
  const menuBtnHoverBg = MENU_BTN_HOVER_BG

  return (
    <>
      {menu && (
        <div
          ref={menuRef}
          className="fixed z-[100] p-1 min-w-[200px]"
          style={{ left: menu.x, top: menu.y, background: 'var(--app-card)', border: 'var(--input-border)', borderRadius: 'var(--card-radius)', boxShadow: 'var(--shadow-lg)' }}
        >
          {isBookmark && (
            <>
              <button className="block w-full text-left h-8 px-3 rounded text-body cursor-default"
                style={menuBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.background = menuBtnHoverBg }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                onClick={() => { closeMenu(); if (targetId) setEditingBookmark(targetId) }}>
                编辑
              </button>
              <button className="block w-full text-left h-8 px-3 rounded text-body cursor-default"
                style={menuBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.background = menuBtnHoverBg }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                onClick={handleCopyLink}>
                复制链接
              </button>
              <div className="border-t my-0.5" style={{ borderColor: 'var(--divider-color)' }} />
              <button className="block w-full text-left h-8 px-3 rounded text-body cursor-default"
                style={menuBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.background = menuBtnHoverBg }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                onClick={() => openUrl('_blank')}>
                在新标签页中打开
              </button>
              <button className="block w-full text-left h-8 px-3 rounded text-body cursor-default"
                style={menuBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.background = menuBtnHoverBg }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                onClick={() => openUrl('_blank', 'popup')}>
                在新窗口中打开
              </button>
              <div className="border-t my-0.5" style={{ borderColor: 'var(--divider-color)' }} />
              <button className="block w-full text-left h-8 px-3 rounded text-body cursor-default"
                style={{ color: 'var(--app-danger)' }}
                onMouseEnter={e => { e.currentTarget.style.background = menuBtnHoverBg }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                onClick={handleDelete}>
                删除
              </button>
            </>
          )}

          {!isBookmark && (
            <>
              <button className="block w-full text-left h-8 px-3 rounded text-body cursor-default"
                style={menuBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.background = menuBtnHoverBg }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                onClick={handleRename}>
                重命名
              </button>
              <div className="border-t my-0.5" style={{ borderColor: 'var(--divider-color)' }} />
              <button className="block w-full text-left h-8 px-3 rounded text-body cursor-default"
                style={{ color: 'var(--app-danger)' }}
                onMouseEnter={e => { e.currentTarget.style.background = menuBtnHoverBg }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                onClick={handleDelete}>
                删除
              </button>
            </>
          )}
        </div>
      )}

      {/* Edit Bookmark Modal */}
      {editingBookmark && (() => {
        const bm = useBookmarkStore.getState().bookmarks.find(b => b.id === editingBookmark)
        if (!bm) return null
        return (
          <EditBookmarkModal
            bookmark={bm}
            onClose={() => setEditingBookmark(null)}
            onSaved={async () => {
              await useBookmarkStore.getState().load(useFolderStore.getState().selectedId)
            }}
          />
        )
      })()}

      {/* Rename Folder Modal */}
      {renamingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--overlay)' }} onClick={() => setRenamingFolder(null)}>
          <div className="p-6 w-80" style={{ background: 'var(--app-card)', border: 'var(--input-border)', borderRadius: 'var(--card-radius)', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--app-text)' }}>重命名文件夹</h3>
            <input
              autoFocus
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitRename()}
              className="w-full h-9 px-3 rounded text-sm outline-none mb-4"
              style={{ border: 'var(--input-border)', boxShadow: 'var(--input-shadow)', background: 'var(--input-bg)', color: 'var(--app-text)' }}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenamingFolder(null)} className="h-8 px-4 rounded text-body cursor-default"
                style={{ border: 'var(--input-border)', boxShadow: 'var(--shadow)', background: 'var(--app-card)', color: 'var(--app-text)' }}>取消</button>
              <button onClick={submitRename} disabled={!folderName.trim()} className="h-8 px-4 border-none rounded text-white text-body font-medium cursor-default disabled:opacity-50"
                style={{ background: 'var(--app-accent)', boxShadow: 'var(--shadow)' }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
