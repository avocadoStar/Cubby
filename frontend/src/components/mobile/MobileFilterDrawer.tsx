import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Folder, Star, X } from 'lucide-react'
import Input from '../Input'
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
      <div onClick={onClose}
        className="absolute inset-0 z-50"
        style={{
          background: `rgba(0,0,0,${overlayOpacity.mobileScrim})`,
          opacity: animated ? 1 : 0,
          transition: transitionFor('opacity', animated ? 'normal' : 'exit', animated ? 'standard' : 'exit', prefersReducedMotion),
          pointerEvents: animated ? 'auto' : 'none',
        }} />

      {/* Drawer */}
      <div
        onTransitionEnd={handleTransitionEnd}
        className="absolute top-0 right-0 bottom-0 w-full bg-app-card z-[51] flex flex-col"
        style={{
          transform: animated ? motionTransform.drawer.open : motionTransform.drawer.closed,
          transition: transitionFor('transform', animated ? 'normal' : 'exit', animated ? 'enter' : 'exit', prefersReducedMotion),
        }}
      >
        {/* Header */}
        <div className="px-4 pt-7 pb-3 flex items-center justify-between border-b border-divider shrink-0">
          <span className="text-base font-semibold text-app-text">文件夹</span>
          <button onClick={onClose}
            className="w-8 h-8 rounded-button border-none bg-app-hover text-app-text2 cursor-pointer flex items-center justify-center"
            aria-label="关闭">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 px-4 border-b border-divider shrink-0">
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索文件夹..."
            className="h-[38px] bg-app-hover"
            inputStyle={{ border: '1px solid var(--app-border)' }}
          />
        </div>

        {/* Folder tree */}
        <div className="flex-1 overflow-auto [-webkit-overflow-scrolling:touch] p-3 px-4">
          <div className="text-[11px] font-semibold text-[var(--app-text3)] uppercase tracking-wide mb-2">
            收藏夹
          </div>

          {/* All bookmarks */}
          <div onClick={async () => { await select(null); onClose() }}
            className="flex items-center gap-2 py-2.5 px-3 rounded-button cursor-pointer text-sm mb-0.5"
            style={{
              color: selectedId === null ? 'var(--app-accent)' : 'var(--app-text2)',
              background: selectedId === null ? 'var(--accent-light, #EFF6FF)' : 'transparent',
              fontWeight: selectedId === null ? 500 : 400,
            }}>
            <span className="w-[18px] flex justify-center">
              <Star size={16} strokeWidth={1.7} />
            </span>
            <span className="flex-1">所有书签</span>
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
                  className="flex items-center gap-2 py-2.5 px-3 rounded-button cursor-pointer text-sm mb-0.5"
                  style={{
                    color: isSelected ? 'var(--app-accent)' : 'var(--app-text2)',
                    background: isSelected ? 'var(--accent-light, #EFF6FF)' : 'transparent',
                    fontWeight: isSelected ? 500 : 400,
                    paddingLeft: 12 + depth * 16,
                  }}
                >
                  {hasCh ? (
                    <span className="w-[18px] flex justify-center text-[10px] text-[var(--app-text3)]"
                      style={{
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                        transition: 'transform 0.2s ease',
                      }}>
                      <ChevronRight size={14} strokeWidth={1.8} />
                    </span>
                  ) : (
                    <span className="w-[18px] invisible">
                      <ChevronRight size={14} strokeWidth={1.8} />
                    </span>
                  )}
                  <Folder size={16} strokeWidth={1.8} />
                  <span className="flex-1">{node.name}</span>
                  {hasCh && (
                    <span className="text-[11px] text-[var(--app-text3)] bg-app-hover py-px px-1.5 rounded-badge">
                      {(childrenMap.get(node.id) || []).length}
                    </span>
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
