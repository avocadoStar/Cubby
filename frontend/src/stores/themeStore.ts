import { create } from 'zustand'
import { themes, type Theme } from '../lib/themes'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value as string)
  }
}

interface ThemeState {
  themeId: string
  setTheme: (id: string) => void
  getTheme: () => Theme
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: (() => {
    const saved = localStorage.getItem('cubby-theme')
    const theme = themes.find(t => t.id === saved) ?? themes[0]
    applyTheme(theme)
    return theme.id
  })(),

  setTheme: (id) => {
    const theme = themes.find(t => t.id === id) ?? themes[0]
    localStorage.setItem('cubby-theme', id)
    applyTheme(theme)
    set({ themeId: id })
  },

  getTheme: () => themes.find(t => t.id === get().themeId) ?? themes[0],
}))
