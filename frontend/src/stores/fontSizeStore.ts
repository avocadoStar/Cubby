import { create } from 'zustand'

export type FontSizePreset = 'small' | 'medium' | 'large'

const SCALE = [-2, -1, 0, 1, 2, 3] as const
const SCALE_NAMES = ['--fs--2', '--fs--1', '--fs-0', '--fs-1', '--fs-2', '--fs-3'] as const

const PRESET_VALUES: Record<FontSizePreset, { base: number }> = {
  small: { base: 14 },
  medium: { base: 16 },
  large: { base: 18 },
}

function applyPreset(preset: FontSizePreset) {
  const base = PRESET_VALUES[preset].base
  const root = document.documentElement

  SCALE.forEach((step, index) => {
    root.style.setProperty(SCALE_NAMES[index], `${Number((base * Math.pow(1.25, step)).toFixed(2))}px`)
  })

  root.style.setProperty('--fs-body', 'var(--fs-0)')
  root.style.setProperty('--fs-small', 'var(--fs--1)')
}

interface FontSizeState {
  preset: FontSizePreset
  setPreset: (p: FontSizePreset) => void
}

export const useFontSizeStore = create<FontSizeState>((set) => ({
  preset: (() => {
    const saved = localStorage.getItem('cubby-font-size') as FontSizePreset | null
    if (!saved || !PRESET_VALUES[saved] || saved === 'small') {
      localStorage.setItem('cubby-font-size', 'medium')
      return 'medium'
    }
    return saved
  })(),

  setPreset: (preset) => {
    localStorage.setItem('cubby-font-size', preset)
    applyPreset(preset)
    set({ preset })
  },
}))

// Apply on load
applyPreset(useFontSizeStore.getState().preset)
