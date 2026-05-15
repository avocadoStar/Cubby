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

  it('defines complete surface tokens for every application theme', () => {
    for (const theme of themes) {
      expect(theme.vars['--radius-xs']).toBeTruthy()
      expect(theme.vars['--radius-sm']).toBeTruthy()
      expect(theme.vars['--radius-md']).toBeTruthy()
      expect(theme.vars['--radius-lg']).toBeTruthy()
      expect(theme.vars['--radius-xl']).toBeTruthy()
      expect(theme.vars['--radius-pill']).toBe('999px')
      expect(theme.vars['--btn-radius']).toBeTruthy()
      expect(theme.vars['--input-radius']).toBeTruthy()
      expect(theme.vars['--badge-radius']).toBeTruthy()
      expect(theme.vars['--bg-texture']).toBeDefined()
      expect(theme.vars['--sidebar-shadow']).toBeDefined()
    }
  })

  it('keeps Fluent Card text colors readable on light surfaces', () => {
    const fluent = themes.find(theme => theme.id === 'fluent-card')

    expect(fluent?.vars['--text-primary']).toBe('#0F172A')
    expect(fluent?.vars['--text-secondary']).toBe('#334155')
    expect(fluent?.vars['--text-tertiary']).toBe('#5B667A')
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
