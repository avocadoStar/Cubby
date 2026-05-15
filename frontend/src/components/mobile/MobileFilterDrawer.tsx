import { useEffect, useRef, useState } from 'react'
import { useFolderStore } from '../../stores/folderStore'
import { motionTransform, overlayOpacity, transitionFor } from '../../lib/motion'

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function MobileFilterDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { visibleNodes, selectedId, select, toggleExpand, expandedIds, childrenMap } = useFolderStore()
  const [search, setSearch] = useState('')
  const [animated, setAnimated] = useState(false)
  const [mounted, setMounted] = useState(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      rafRef.current = requestAnimationFrame(() => setAnimated(true))
    } else {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      setAnimated(false)
    }
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
  }, [open])

  const handleTransitionEnd = () => {
    if (!animated) setMounted(false)
  }

  const filteredNodes = search.trim()
    ? visibleNodes.filter(n => n.node.name.toLowerCase().includes(search.toLowerCase()))
    : visibleNodes

  const hasChildren = (id: string) => {
    const children = childrenMap.get(id)
    return children && children.length > 0
  }

  if (!mounted) return null

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: `rgba(0,0,0,${overlayOpacity.mobileScrim})`, zIndex: 50,
        opacity: animated ? 1 : 0,
        transition: transitionFor('opacity', animated ? 'normal' : 'exit', animated ? 'standard' : 'exit', prefersReducedMotion),
        pointerEvents: animated ? 'auto' : 'none',
      }} />

      {/* Drawer */}
      <div
        onTransitionEnd={handleTransitionEnd}
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: '100%',
          background: 'var(--app-card)', zIndex: 51,
          transform: animated ? motionTransform.drawer.open : motionTransform.drawer.closed,
          transition: transitionFor('transform', animated ? 'normal' : 'exit', animated ? 'enter' : 'exit', prefersReducedMotion),
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '28px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--divider-color)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--app-text)' }}>文件夹</span>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'var(--app-hover)', color: 'var(--app-text2)', fontSize: 18,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--divider-color)', flexShrink: 0 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索文件夹..."
            style={{
              width: '100%', height: 38, border: '1px solid var(--app-border)', borderRadius: 8,
              padding: '0 12px', fontSize: 14, background: 'var(--app-hover)',
              color: 'var(--app-text)', outline: 'none',
            }}
          />
        </div>

        {/* Folder tree */}
        <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch', padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--app-text3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            收藏夹
          </div>

          {/* All bookmarks */}
          <div onClick={async () => { await select(null); onClose() }} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
            fontSize: 14, color: selectedId === null ? 'var(--app-accent)' : 'var(--app-text2)',
            background: selectedId === null ? 'var(--accent-light, #EFF6FF)' : 'transparent',
            fontWeight: selectedId === null ? 500 : 400, marginBottom: 2,
          }}>
            <span style={{ width: 18, display: 'flex', justifyContent: 'center', fontSize: 14 }}>⭐</span>
            <span style={{ flex: 1 }}>所有书签</span>
          </div>

          {filteredNodes.map(({ node, depth }) => {
            const isExpanded = expandedIds.has(node.id)
            const isSelected = selectedId === node.id
            const hasCh = hasChildren(node.id)

            return (
              <div key={node.id}>
                <div
                  onClick={async () => {
                    if (hasCh) toggleExpand(node.id)
                    await select(node.id)
                    if (!hasCh) onClose()
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 14, color: isSelected ? 'var(--app-accent)' : 'var(--app-text2)',
                    background: isSelected ? 'var(--accent-light, #EFF6FF)' : 'transparent',
                    fontWeight: isSelected ? 500 : 400,
                    paddingLeft: 12 + depth * 16,
                    marginBottom: 2,
                  }}
                >
                  {hasCh ? (
                    <span style={{
                      width: 18, display: 'flex', justifyContent: 'center',
                      fontSize: 10, color: 'var(--app-text3)',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                      transition: 'transform 0.2s ease',
                    }}>▶</span>
                  ) : (
                    <span style={{ width: 18, visibility: 'hidden' }}>▶</span>
                  )}
                  <span style={{ fontSize: 14 }}>📁</span>
                  <span style={{ flex: 1 }}>{node.name}</span>
                  {hasCh && (
                    <span style={{
                      fontSize: 11, color: 'var(--app-text3)', background: 'var(--app-hover)',
                      padding: '1px 6px', borderRadius: 8,
                    }}>{(childrenMap.get(node.id) || []).length}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
