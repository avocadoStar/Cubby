export interface ThemeVars {
  // canonical
  '--bg': string
  '--card-bg': string
  '--border': string
  '--border-hover': string
  '--hover': string
  '--accent': string
  '--accent-light': string
  '--text-on-accent': string
  '--text-primary': string
  '--text-secondary': string
  '--text-tertiary': string
  '--danger': string
  '--danger-bg': string
  '--success-bg': string
  '--note-hover': string
  '--note-bg': string
  '--shadow': string
  '--shadow-lg': string
  '--overlay': string
  '--search-highlight': string
  '--folder-icon-fill': string
  '--folder-icon-stroke': string
  '--card-radius': string
  '--card-gap': string
  '--card-border': string
  '--card-border-hover': string
  '--card-shadow-hover': string
  // style variables
  '--row-shadow': string
  '--input-bg': string
  '--input-border': string
  '--input-shadow': string
  '--input-shadow-focus': string
  '--sidebar-border': string
  '--tree-hover-bg': string
  '--tree-hover-shadow': string
  '--row-icon-bg': string
  '--row-icon-shadow': string
  '--row-icon-radius': string
  '--checkbox-border': string
  '--divider-color': string
  '--scrollbar-track': string
  '--scrollbar-thumb': string
  '--scrollbar-thumb-hover': string
  // app aliases
  '--app-bg': string
  '--app-card': string
  '--app-border': string
  '--app-hover': string
  '--app-accent': string
  '--app-text': string
  '--app-text2': string
  '--app-text3': string
  '--app-danger': string
  '--app-note-bg': string
}

export interface Theme {
  id: string
  name: string
  vars: ThemeVars
}

const ALIASES: Record<string, string[]> = {
  '--bg': ['--app-bg'],
  '--card-bg': ['--app-card'],
  '--border': ['--app-border'],
  '--hover': ['--app-hover'],
  '--accent': ['--app-accent'],
  '--text-primary': ['--app-text'],
  '--text-secondary': ['--app-text2'],
  '--text-tertiary': ['--app-text3'],
  '--danger': ['--app-danger'],
  '--note-bg': ['--app-note-bg'],
}

function createVars(base: Partial<Record<keyof ThemeVars, string>>): ThemeVars {
  const vars = {} as Record<keyof ThemeVars, string>
  for (const [canon, aliases] of Object.entries(ALIASES)) {
    const value = (base as Record<string, string>)[canon] ?? ''
    vars[canon as keyof ThemeVars] = value
    for (const alias of aliases) vars[alias as keyof ThemeVars] = value
  }
  for (const [key, value] of Object.entries(base)) {
    if (!(key in vars)) vars[key as keyof ThemeVars] = value
  }
  return vars as ThemeVars
}

export const themes: Theme[] = [
  {
    id: 'fluent-card',
    name: 'Fluent Card',
    vars: createVars({
      '--bg': '#F3F4F6',
      '--card-bg': '#FFFFFF',
      '--border': '#E5E7EB',
      '--border-hover': '#D1D5DB',
      '--hover': '#F9FAFB',
      '--accent': '#3B82F6',
      '--accent-light': '#EFF6FF',
      '--text-on-accent': '#FFFFFF',
      '--text-primary': '#111827',
      '--text-secondary': '#4B5563',
      '--text-tertiary': '#9CA3AF',
      '--danger': '#EF4444',
      '--danger-bg': '#FEF2F2',
      '--success-bg': '#F0FDF4',
      '--note-hover': '#F9FAFB',
      '--note-bg': '#FFFFFF',
      '--shadow': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      '--overlay': 'rgba(17, 24, 39, 0.4)',
      '--search-highlight': '#DBEAFE',
      '--folder-icon-fill': '#EFF6FF',
      '--folder-icon-stroke': '#3B82F6',
      '--card-radius': '12px',
      '--card-gap': '8px',
      '--card-border': '1px solid #E5E7EB',
      '--card-border-hover': '1px solid #D1D5DB',
      '--card-shadow-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      '--row-shadow': 'none',
      '--input-bg': '#F9FAFB',
      '--input-border': '1px solid #E5E7EB',
      '--input-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '--input-shadow-focus': '0 0 0 2px rgba(59, 130, 246, 0.5)',
      '--sidebar-border': '1px solid #E5E7EB',
      '--tree-hover-bg': '#F3F4F6',
      '--tree-hover-shadow': 'none',
      '--row-icon-bg': '#F3F4F6',
      '--row-icon-shadow': 'none',
      '--row-icon-radius': '6px',
      '--checkbox-border': '2px solid #D1D5DB',
      '--divider-color': '#E5E7EB',
      '--scrollbar-track': '#F3F4F6',
      '--scrollbar-thumb': '#CBD5E1',
      '--scrollbar-thumb-hover': '#94A3B8',
    }),
  },
  {
    id: 'neumorphism',
    name: 'Neumorphism',
    vars: createVars({
      '--bg': '#E0E5EC',
      '--card-bg': '#E0E5EC',
      '--border': 'transparent',
      '--border-hover': 'transparent',
      '--hover': 'rgba(255, 255, 255, 0.4)',
      '--accent': '#4A90E2',
      '--accent-light': '#D1E3F8',
      '--text-on-accent': '#FFFFFF',
      '--text-primary': '#2D3748',
      '--text-secondary': '#718096',
      '--text-tertiary': '#A0AEC0',
      '--danger': '#E53E3E',
      '--danger-bg': '#FED7D7',
      '--success-bg': '#C6F6D5',
      '--note-hover': 'rgba(255, 255, 255, 0.4)',
      '--note-bg': '#E0E5EC',
      '--shadow': '9px 9px 16px rgba(163, 177, 198, 0.6), -9px -9px 16px rgba(255, 255, 255, 0.5)',
      '--shadow-lg': '12px 12px 24px rgba(163, 177, 198, 0.7), -12px -12px 24px rgba(255, 255, 255, 0.6)',
      '--overlay': 'rgba(45, 55, 72, 0.4)',
      '--search-highlight': '#D1E3F8',
      '--folder-icon-fill': '#E0E5EC',
      '--folder-icon-stroke': '#4A90E2',
      '--card-radius': '16px',
      '--card-gap': '12px',
      '--card-border': '1px solid rgba(255, 255, 255, 0.2)',
      '--card-border-hover': '1px solid rgba(255, 255, 255, 0.4)',
      '--card-shadow-hover': 'inset 2px 2px 5px rgba(163, 177, 198, 0.4), inset -3px -3px 7px rgba(255, 255, 255, 0.5)',
      '--row-shadow': '5px 5px 10px rgba(163, 177, 198, 0.4), -5px -5px 10px rgba(255, 255, 255, 0.4)',
      '--input-bg': '#E0E5EC',
      '--input-border': 'transparent',
      '--input-shadow': 'inset 6px 6px 10px 0 rgba(163, 177, 198, 0.5), inset -6px -6px 10px 0 rgba(255, 255, 255, 0.5)',
      '--input-shadow-focus': 'inset 6px 6px 10px 0 rgba(163, 177, 198, 0.5), inset -6px -6px 10px 0 rgba(255, 255, 255, 0.5), 0 0 0 2px rgba(74, 144, 226, 0.3)',
      '--sidebar-border': 'transparent',
      '--tree-hover-bg': 'rgba(255, 255, 255, 0.4)',
      '--tree-hover-shadow': 'inset 3px 3px 6px rgba(163, 177, 198, 0.4), inset -3px -3px 6px rgba(255, 255, 255, 0.4)',
      '--row-icon-bg': '#E0E5EC',
      '--row-icon-shadow': '3px 3px 6px rgba(163, 177, 198, 0.5), -3px -3px 6px rgba(255, 255, 255, 0.5)',
      '--row-icon-radius': '10px',
      '--checkbox-border': '2px solid rgba(163, 177, 198, 0.8)',
      '--divider-color': 'rgba(163, 177, 198, 0.3)',
      '--scrollbar-track': '#E0E5EC',
      '--scrollbar-thumb': 'rgba(113, 128, 150, 0.36)',
      '--scrollbar-thumb-hover': 'rgba(74, 144, 226, 0.48)',
    }),
  },
]

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme.id
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value)
  }
}
