import { useNavigate } from 'react-router-dom'
import type { ThemeMode } from '../hooks/useThemeMode'
import { Button } from './ui/Button'
import { Surface } from './ui/Surface'

type TopBarProps = {
  onOpenSidebar: () => void
  onToggleTheme: () => void
  routeSubtitle: string
  routeTitle: string
  themeMode: ThemeMode
}

const themeLabel: Record<ThemeMode, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
}

const themeIcon: Record<ThemeMode, string> = {
  system: '◎',
  light: '☀',
  dark: '☾',
}

export function TopBar({ onOpenSidebar, onToggleTheme, routeSubtitle, routeTitle, themeMode }: TopBarProps) {
  const navigate = useNavigate()

  return (
    <Surface className="sticky top-4 z-30 flex items-center justify-between gap-4 px-4 py-3 lg:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <button className="icon-button lg:hidden" onClick={onOpenSidebar} type="button">
          <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
            <path d="M4 7h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            <path d="M4 12h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            <path d="M4 17h10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </button>
        <div className="min-w-0">
          <div className="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--text-quaternary)] sm:block">Cubby</div>
          <div className="truncate text-[16px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-[18px]">{routeTitle}</div>
          <div className="hidden text-[12px] text-[var(--text-tertiary)] sm:block">{routeSubtitle}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button className="w-10 px-0 sm:w-auto sm:px-4" leading={themeIcon[themeMode]} onClick={onToggleTheme} size="sm" variant="secondary">
          <span className="hidden sm:inline">{themeLabel[themeMode]}</span>
        </Button>
        <Button className="w-10 px-0 sm:w-auto sm:px-4" leading="⌘" onClick={() => navigate('/settings')} size="sm" variant="ghost">
          <span className="hidden sm:inline">设置</span>
        </Button>
      </div>
    </Surface>
  )
}
