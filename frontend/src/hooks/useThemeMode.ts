import { useEffect, useState } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'cubby-theme-mode'

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    getInitialThemeMode() === 'system' ? getSystemTheme() : (getInitialThemeMode() as ResolvedTheme),
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const syncTheme = () => {
      const nextTheme = themeMode === 'system' ? getSystemTheme() : themeMode
      setResolvedTheme(nextTheme)
      document.documentElement.dataset.theme = nextTheme
      document.documentElement.dataset.themeMode = themeMode
      window.localStorage.setItem(STORAGE_KEY, themeMode)
    }

    syncTheme()
    media.addEventListener('change', syncTheme)

    return () => {
      media.removeEventListener('change', syncTheme)
    }
  }, [themeMode])

  return {
    themeMode,
    resolvedTheme,
    setThemeMode,
    toggleResolvedTheme: () => {
      setThemeMode((current) => {
        const active = current === 'system' ? getSystemTheme() : current
        return active === 'dark' ? 'light' : 'dark'
      })
    },
  }
}
