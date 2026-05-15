import { useEffect, useRef, useState } from 'react'
import {
  Download,
  Upload,
  Settings,
  LogOut,
} from 'lucide-react'
import { motionTransform, overlayOpacity, transitionFor } from '../../lib/motion'

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface MenuItem {
  icon: React.ReactNode
  label: string
  danger?: boolean
  onClick: () => void
}

export default function MobileActionMenu({
  open,
  onClose,
  onImport,
  onExport,
  onSettings,
  onLogout,
}: {
  open: boolean
  onClose: () => void
  onImport: () => void
  onExport: () => void
  onSettings: () => void
  onLogout: () => void
}) {
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

  if (!mounted) return null

  const iconSize = 18

  const items: MenuItem[] = [
    {
      icon: <Download size={iconSize} />,
      label: '导入',
      onClick: () => { onClose(); onImport() },
    },
    {
      icon: <Upload size={iconSize} />,
      label: '导出',
      onClick: () => { onClose(); onExport() },
    },
    {
      icon: <Settings size={iconSize} />,
      label: '设置',
      onClick: () => { onClose(); onSettings() },
    },
    {
      icon: <LogOut size={iconSize} />,
      label: '退出登录',
      danger: true,
      onClick: () => { onClose(); onLogout() },
    },
  ]

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{
          background: `rgba(0,0,0,${overlayOpacity.mobileMenuScrim})`,
          opacity: animated ? 1 : 0,
          transition: transitionFor('opacity', animated ? 'normal' : 'exit', animated ? 'standard' : 'exit', prefersReducedMotion),
          pointerEvents: animated ? 'auto' : 'none',
        }}
      />

      {/* Menu panel */}
      <div
        onTransitionEnd={handleTransitionEnd}
        role="menu"
        aria-label="操作菜单"
        className="absolute top-[52px] right-2 z-41 bg-app-card rounded-card shadow-app-lg border border-app-border min-w-[180px] overflow-hidden origin-top-right"
        style={{
          transform: animated ? motionTransform.menu.open : motionTransform.menu.closed,
          opacity: animated ? 1 : 0,
          transition: [
            transitionFor('transform', animated ? 'fast' : 'exit', animated ? 'enter' : 'exit', prefersReducedMotion),
            transitionFor('opacity', animated ? 'fast' : 'exit', animated ? 'enter' : 'exit', prefersReducedMotion),
          ].join(', '),
        }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            role="menuitem"
            onClick={item.onClick}
            className="flex items-center gap-3 px-4 h-11 cursor-pointer"
            style={{
              color: item.danger ? 'var(--app-danger)' : 'var(--app-text)',
              borderBottom: i < items.length - 1 ? '1px solid var(--divider-color)' : 'none',
              background: 'transparent',
              transition: transitionFor('background', 'instant', 'standard', prefersReducedMotion),
            }}
            onTouchStart={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--app-hover)'
            }}
            onTouchEnd={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            <span className="flex shrink-0">{item.icon}</span>
            <span className="text-sm font-normal">{item.label}</span>
          </div>
        ))}
      </div>
    </>
  )
}
