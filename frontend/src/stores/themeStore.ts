import { create } from 'zustand'
import { themes, applyTheme, type Theme } from '../lib/themes'

interface ThemeTransitionOrigin {
  x: number
  y: number
}

interface ThemeState {
  themeId: string
  setTheme: (id: string, origin?: ThemeTransitionOrigin) => void
  getTheme: () => Theme
}

interface ViewTransitionLike {
  ready: Promise<void>
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => ViewTransitionLike
}

const THEME_TRANSITION_DURATION = 320
const THEME_TRANSITION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

function shouldSkipThemeTransition() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return true
  if (document.visibilityState === 'hidden') return true
  if (!('startViewTransition' in document)) return true
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function animateThemeReveal(origin: ThemeTransitionOrigin) {
  const endRadius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  )

  document.documentElement.animate(
    {
      clipPath: [
        `circle(0px at ${origin.x}px ${origin.y}px)`,
        `circle(${endRadius}px at ${origin.x}px ${origin.y}px)`,
      ],
    },
    {
      duration: THEME_TRANSITION_DURATION,
      easing: THEME_TRANSITION_EASING,
      pseudoElement: '::view-transition-new(root)',
    },
  )
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: (() => {
    const saved = localStorage.getItem('cubby-theme')
    const theme = themes.find(t => t.id === saved) ?? themes[0]
    applyTheme(theme)
    return theme.id
  })(),

  setTheme: (id, origin) => {
    const theme = themes.find(t => t.id === id) ?? themes[0]
    const applyThemeChange = () => {
      localStorage.setItem('cubby-theme', id)
      applyTheme(theme)
      set({ themeId: id })
    }

    if (!origin || shouldSkipThemeTransition()) {
      applyThemeChange()
      return
    }

    try {
      const transition = (document as ViewTransitionDocument).startViewTransition?.(applyThemeChange)
      if (!transition) {
        applyThemeChange()
        return
      }
      void transition.ready.then(() => animateThemeReveal(origin)).catch(() => {})
    } catch {
      applyThemeChange()
    }
  },

  getTheme: () => themes.find(t => t.id === get().themeId) ?? themes[0],
}))
