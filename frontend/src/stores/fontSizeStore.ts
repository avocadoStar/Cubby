import { create } from 'zustand'

export type FontSizePreset = 'small' | 'medium' | 'large'

const PRESET_VALUES: Record<FontSizePreset, { body: number; small: number }> = {
  small:  { body: 12, small: 8 },
  medium: { body: 13, small: 9 },
  large:  { body: 15, small: 11 },
}

function applyPreset(preset: FontSizePreset) {
  const v = PRESET_VALUES[preset]
  document.documentElement.style.setProperty('--fs-body', `${v.body}px`)
  document.documentElement.style.setProperty('--fs-small', `${v.small}px`)
}

interface FontSizeState {
  preset: FontSizePreset
  setPreset: (p: FontSizePreset) => void
}

export const useFontSizeStore = create<FontSizeState>((set) => ({
  preset: ((localStorage.getItem('cubby-font-size') || 'medium') as FontSizePreset),

  setPreset: (preset) => {
    localStorage.setItem('cubby-font-size', preset)
    applyPreset(preset)
    set({ preset })
  },
}))

// Apply on load
applyPreset(useFontSizeStore.getState().preset)
