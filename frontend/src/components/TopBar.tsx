import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ThemeMode } from '../hooks/useThemeMode'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'

type TopBarProps = {
  hideRouteCopy?: boolean
  onLogout: () => void
  onOpenSidebar: () => void
  onToggleTheme: () => void
  routeSubtitle: string
  routeTitle: string
  scrolled: boolean
  themeMode: ThemeMode
}

const themeLabel: Record<ThemeMode, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
}

const themeIcon: Record<ThemeMode, ReactNode> = {
  system: <Icon className="text-[14px]" name="monitor" />,
  light: <Icon className="text-[14px]" name="star" />,
  dark: <Icon className="text-[14px]" name="moon" />,
}

export function TopBar({
  hideRouteCopy = false,
  onLogout,
  onOpenSidebar,
  onToggleTheme,
  routeSubtitle,
  routeTitle,
  scrolled,
  themeMode,
}: TopBarProps) {
  const navigate = useNavigate()

  return (
    <header className="topbar-shell" data-scrolled={scrolled}>
      <div className="flex min-h-14 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 py-3">
          <button aria-label="打开导航" className="icon-button lg:hidden" onClick={onOpenSidebar} type="button">
            <Icon className="text-[16px]" name="menu" />
          </button>

          {!hideRouteCopy ? (
            <div className="min-w-0">
              <div className="truncate text-[18px] font-semibold leading-6 text-[var(--color-text)]">{routeTitle}</div>
              <div className="hidden truncate text-[12px] leading-4 text-[var(--color-text-secondary)] sm:block">
                {routeSubtitle}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 py-3">
          <Button
            className="w-9 px-0 sm:w-auto sm:px-3"
            leading={themeIcon[themeMode]}
            onClick={onToggleTheme}
            size="sm"
            variant="secondary"
          >
            <span className="hidden sm:inline">{themeLabel[themeMode]}</span>
          </Button>
          <Button
            className="w-9 px-0 sm:w-auto sm:px-3"
            leading={<Icon className="text-[14px]" name="settings" />}
            onClick={() => navigate('/settings')}
            size="sm"
            variant="ghost"
          >
            <span className="hidden sm:inline">设置</span>
          </Button>
          <Button
            className="w-9 px-0 sm:w-auto sm:px-3"
            leading={<Icon className="text-[14px]" name="log-out" />}
            onClick={onLogout}
            size="sm"
            variant="ghost"
          >
            <span className="hidden sm:inline">退出</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
