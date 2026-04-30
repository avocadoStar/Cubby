import { useState, useEffect, useCallback } from 'react'
import { useBookmarkStore } from '../stores/bookmarkStore'

interface MenuState {
  x: number
  y: number
  type: 'bookmark' | 'folder'
  id: string
}

export default function ContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null)

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault()
    const el = (e.target as HTMLElement).closest('[data-context]') as HTMLElement | null
    if (el) {
      setMenu({
        x: e.clientX,
        y: e.clientY,
        type: el.dataset.context as 'bookmark' | 'folder',
        id: el.dataset.id!,
      })
    }
  }, [])

  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu)
    const close = () => setMenu(null)
    document.addEventListener('mousedown', close)
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('mousedown', close)
    }
  }, [handleContextMenu])

  if (!menu) return null

  const isBookmark = menu.type === 'bookmark'

  return (
    <div
      className="fixed z-[100] bg-white border border-[#e0e0e0] rounded-lg shadow-lg p-1 min-w-[160px]"
      style={{ left: menu.x, top: menu.y }}
    >
      {isBookmark && (
        <button
          className="block w-full text-left h-8 px-3 rounded text-[13px] text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
          onClick={() => {
            const bm = useBookmarkStore.getState().bookmarks.find(b => b.id === menu.id)
            if (bm) window.open(bm.url, '_blank')
            setMenu(null)
          }}
        >
          打开
        </button>
      )}
      <button
        className="block w-full text-left h-8 px-3 rounded text-[13px] text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
        onClick={() => { setMenu(null) }}
      >
        重命名
      </button>
      <div className="border-t border-[#e8e8e8] my-0.5" />
      <button
        className="block w-full text-left h-8 px-3 rounded text-[13px] text-red-500 hover:bg-[#f5f5f5] cursor-default"
        onClick={async () => {
          const { api } = await import('../services/api')
          if (isBookmark) {
            await api.deleteBookmark(menu.id)
          } else {
            await api.deleteFolder(menu.id)
          }
          window.location.reload()
          setMenu(null)
        }}
      >
        删除
      </button>
    </div>
  )
}
