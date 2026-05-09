import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()

function stubBrowserEnvironment() {
  const setProperty = vi.fn()
  const animate = vi.fn()
  const startViewTransition = vi.fn((update: () => void) => {
    update()
    return {
      ready: Promise.resolve(),
      finished: Promise.resolve(),
      updateCallbackDone: Promise.resolve(),
    }
  })

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  })
  vi.stubGlobal('document', {
    documentElement: {
      style: { setProperty },
      animate,
    },
    startViewTransition,
    visibilityState: 'visible',
  })
  vi.stubGlobal('window', {
    innerWidth: 100,
    innerHeight: 80,
    matchMedia: vi.fn(() => ({ matches: false })),
  })

  return { animate, startViewTransition }
}

describe('useThemeStore', () => {
  beforeEach(() => {
    storage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reveals a theme change from the provided origin when view transitions are available', async () => {
    const { animate, startViewTransition } = stubBrowserEnvironment()
    const { useThemeStore } = await import('./themeStore')

    useThemeStore.getState().setTheme('neumorphism', { x: 10, y: 20 })
    await Promise.resolve()

    expect(startViewTransition).toHaveBeenCalledOnce()
    expect(animate).toHaveBeenCalledWith(
      {
        clipPath: [
          'circle(0px at 10px 20px)',
          'circle(108.16653826391968px at 10px 20px)',
        ],
      },
      {
        duration: 320,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  })
})
