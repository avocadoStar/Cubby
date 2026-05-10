import { useState, useEffect, useCallback, useRef } from 'react'

interface Target {
  id: string
  type: 'bookmark' | 'folder'
}

export function useContextMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [target, setTarget] = useState<Target | null>(null)
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

  const closeMenu = useCallback(() => setMenu(null), [])

  return { menu, target, menuRef, closeMenu }
}
