import { useState, useEffect, useCallback, useRef } from 'react'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useFolderStore } from '../stores/folderStore'
import { api } from '../services/api'
import EditBookmarkModal from './EditBookmarkModal'

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
      // Only close if clicking outside the menu
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
      // Optimistic: remove from local state immediately
      useBookmarkStore.getState().load(folderStore.selectedId)
    } else {
      // Get parent before deleting so we can refresh it
      const folder = folderStore.folderMap.get(targetId)
      const parentId = folder?.parent_id ?? null
      await api.deleteFolder(targetId)
      // Reload parent's children and root
      await folderStore.loadChildren(parentId)
      await folderStore.loadChildren(null)
      // If deleted folder was selected, navigate to parent
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

  return (
    <>
      {menu && (
        <div
          ref={menuRef}
          className="fixed z-[100] bg-white border border-[#e0e0e0] rounded-lg shadow-lg p-1 min-w-[200px]"
          style={{ left: menu.x, top: menu.y }}
        >
          {isBookmark && (
            <>
              <button className="block w-full text-left h-8 px-3 rounded text-body text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
                onClick={() => { closeMenu(); if (targetId) setEditingBookmark(targetId) }}>
                编辑
              </button>
              <button className="block w-full text-left h-8 px-3 rounded text-body text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
                onClick={handleCopyLink}>
                复制链接
              </button>
              <div className="border-t border-[#e8e8e8] my-0.5" />
              <button className="block w-full text-left h-8 px-3 rounded text-body text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
                onClick={() => openUrl('_blank')}>
                在新标签页中打开
              </button>
              <button className="block w-full text-left h-8 px-3 rounded text-body text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
                onClick={() => openUrl('_blank', 'popup')}>
                在新窗口中打开
              </button>
              <div className="border-t border-[#e8e8e8] my-0.5" />
              <button className="block w-full text-left h-8 px-3 rounded text-body text-red-500 hover:bg-[#f5f5f5] cursor-default"
                onClick={handleDelete}>
                删除
              </button>
            </>
          )}

          {!isBookmark && (
            <>
              <button className="block w-full text-left h-8 px-3 rounded text-body text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
                onClick={handleRename}>
                重命名
              </button>
              <div className="border-t border-[#e8e8e8] my-0.5" />
              <button className="block w-full text-left h-8 px-3 rounded text-body text-red-500 hover:bg-[#f5f5f5] cursor-default"
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
        if (!bm) { setEditingBookmark(null); return null }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setRenamingFolder(null)}>
          <div className="bg-white border border-[#e0e0e0] rounded-lg shadow-xl p-6 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#1a1a1a] mb-4">重命名文件夹</h3>
            <input
              autoFocus
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitRename()}
              className="w-full h-9 px-3 border border-[#d1d1d1] rounded text-sm outline-none focus:border-[#0078D4] mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenamingFolder(null)} className="h-8 px-4 border border-[#d1d1d1] rounded bg-white text-body cursor-default">取消</button>
              <button onClick={submitRename} disabled={!folderName.trim()} className="h-8 px-4 border-none rounded bg-[#0078D4] text-white text-body font-medium cursor-default disabled:opacity-50">保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
