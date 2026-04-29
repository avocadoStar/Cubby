import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useThemeMode } from '../hooks/useThemeMode'
import { AnimatedBackground } from './AnimatedBackground'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

const pageCopy: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: '书签',
    subtitle: '整理、搜索和管理你的常用链接。',
  },
  '/settings': {
    title: '设置',
    subtitle: '管理 AI、主题和工作区偏好。',
  },
}

type LayoutProps = {
  onLogout: () => void
}

export function Layout({ onLogout }: LayoutProps) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [contentScrolled, setContentScrolled] = useState(false)
  const { resolvedTheme, themeMode, toggleResolvedTheme } = useThemeMode()
  const routeCopy = pageCopy[location.pathname] ?? pageCopy['/']
  const hideRouteCopy = location.pathname === '/'

  return (
    <div className="h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <AnimatedBackground theme={resolvedTheme} />

      <div className="relative z-10 h-full lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">
        <div className="hidden min-h-0 overflow-hidden border-r border-[var(--color-border)] lg:block">
          <Sidebar />
        </div>

        <AnimatePresence>
          {sidebarOpen ? (
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 bg-[var(--color-overlay)] lg:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <motion.div
                animate={{ x: 0 }}
                className="h-full"
                exit={{ x: -16 }}
                initial={{ x: -16 }}
                onClick={(event) => event.stopPropagation()}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <Sidebar mobile onNavigate={() => setSidebarOpen(false)} />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <TopBar
            hideRouteCopy={hideRouteCopy}
            onLogout={onLogout}
            onOpenSidebar={() => setSidebarOpen(true)}
            onToggleTheme={toggleResolvedTheme}
            routeSubtitle={routeCopy.subtitle}
            routeTitle={routeCopy.title}
            scrolled={contentScrolled}
            themeMode={themeMode}
          />

          <main
            className="min-h-0 flex flex-1 flex-col overflow-y-auto px-4 pb-4 pt-6 sm:px-6 sm:pt-8 lg:px-8"
            onScroll={(event) => setContentScrolled(event.currentTarget.scrollTop > 8)}
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
