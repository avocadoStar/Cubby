import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, themes } from './themes'

describe('themes', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not include Sunny as an application theme', () => {
    const sunny = themes.find(theme => theme.id === 'sunny')

    expect(sunny).toBeUndefined()
  })

  it('marks the active theme on the document root for theme-scoped styling', () => {
    const setProperty = vi.fn()
    const root = {
      style: { setProperty },
      dataset: {} as Record<string, string>,
    }
    vi.stubGlobal('document', { documentElement: root })

    const neumorphism = themes.find(theme => theme.id === 'neumorphism')
    expect(neumorphism).toBeDefined()

    applyTheme(neumorphism!)

    expect(root.dataset.theme).toBe('neumorphism')
  })
})
