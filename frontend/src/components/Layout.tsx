import { AnimatePresence, motion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { AnimatedBackground } from './AnimatedBackground'
import { Sidebar } from './Sidebar'
import { Surface } from './ui/Surface'
import { TopBar } from './TopBar'
import { useThemeMode } from '../hooks/useThemeMode'

const pageCopy: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: '收藏空间',
    subtitle: '把高频链接整理成轻盈、清晰、可持续维护的个人工作台。',
  },
  '/settings': {
    title: '偏好设置',
    subtitle: '管理 AI 提供商、模型配置和界面主题偏好。',
  },
}

export function Layout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { resolvedTheme, themeMode, toggleResolvedTheme } = useThemeMode()
  const routeCopy = pageCopy[location.pathname] ?? pageCopy['/']

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--app-background)] text-[var(--text-primary)]">
      <AnimatedBackground theme={resolvedTheme} />

      <div className="relative z-10 flex min-h-screen">
        <div className="hidden px-4 py-4 lg:block">
          <Sidebar />
        </div>

        <AnimatePresence>
          {sidebarOpen ? (
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm lg:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            >
              <motion.div
                animate={{ x: 0 }}
                className="h-full w-full max-w-[340px] p-4"
                exit={{ x: -24 }}
                initial={{ x: -32 }}
                onClick={(event) => event.stopPropagation()}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              >
                <Sidebar mobile onNavigate={() => setSidebarOpen(false)} />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col px-4 pb-4 pt-4 lg:pl-0">
          <TopBar
            onOpenSidebar={() => setSidebarOpen(true)}
            onToggleTheme={toggleResolvedTheme}
            routeSubtitle={routeCopy.subtitle}
            routeTitle={routeCopy.title}
            themeMode={themeMode}
          />

          <div className="flex min-h-0 flex-1 pt-4">
            <AnimatePresence mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="min-h-0 flex-1"
                exit={{ opacity: 0, y: 10 }}
                initial={{ opacity: 0, y: 16 }}
                key={location.pathname}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              >
                <Surface className="h-full overflow-hidden p-0" tone="subtle">
                  <Outlet />
                </Surface>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
