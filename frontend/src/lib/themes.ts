export interface ThemeVars {
  // canonical
  '--bg': string
  '--card-bg': string
  '--border': string
  '--border-hover': string
  '--hover': string
  '--accent': string
  '--accent-light': string
  '--text-primary': string
  '--text-secondary': string
  '--text-tertiary': string
  '--danger': string
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
  // style variables (border vs shadow glyph)
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
  // ---- Fluent · Card ----
  {
    id: 'fluent-card',
    name: 'Fluent · Card',
    vars: createVars({
      '--bg': '#FAFAFA',
      '--card-bg': '#FFFFFF',
      '--border': '#E0E0E0',
      '--border-hover': '#CCCCCC',
      '--hover': '#F5F5F5',
      '--accent': '#0078D4',
      '--accent-light': '#E5F0FF',
      '--text-primary': '#1a1a1a',
      '--text-secondary': '#888888',
      '--text-tertiary': '#AAAAAA',
      '--danger': '#cc3333',
      '--note-hover': 'rgba(0,0,0,0.06)',
      '--note-bg': '#F8F8F8',
      '--shadow': '0 1px 2px rgba(0,0,0,0.04)',
      '--shadow-lg': '0 2px 8px rgba(0,0,0,0.1)',
      '--overlay': 'rgba(0,0,0,0.15)',
      '--search-highlight': '#FFF2A8',
      '--folder-icon-fill': '#F0C54F',
      '--folder-icon-stroke': '#D4A830',
      '--card-radius': '8px',
      '--card-gap': '3px',
      '--card-border': '1px solid #E0E0E0',
      '--card-border-hover': '1px solid #CCCCCC',
      '--card-shadow-hover': '0 1px 2px rgba(0,0,0,0.04)',
      // style vars
      '--row-shadow': 'none',
      '--input-bg': '#FAFAFA',
      '--input-border': '1px solid #E0E0E0',
      '--input-shadow': 'none',
      '--input-shadow-focus': '0 0 0 3px rgba(0,120,212,.1)',
      '--sidebar-border': '1px solid #E8E8E8',
      '--tree-hover-bg': '#F5F5F5',
      '--tree-hover-shadow': 'none',
      '--row-icon-bg': '#E8E8E8',
      '--row-icon-shadow': 'none',
      '--row-icon-radius': '4px',
      '--checkbox-border': '2px solid #C0C0C0',
      '--divider-color': '#E0E0E0',
    }),
  },

  // ---- Neumorphism · Pure Neutral Grey ----
  {
    id: 'neumorphism',
    name: 'Neumorphism',
    vars: createVars({
      // surfaces: classic neutral Soft UI, anchored to neumorphism.io/#e0e0e0
      '--bg': '#e0e0e0',
      '--card-bg': '#e6e6e6',
      '--input-bg': '#d8d8d8',
      '--note-bg': '#e6e6e6',
      '--hover': '#ececec',
      '--note-hover': '#ececec',
      '--tree-hover-bg': '#e8e8e8',
      // borders: none, depth from shadows
      '--border': '1px solid transparent',
      '--border-hover': '1px solid transparent',
      '--card-border': '1px solid transparent',
      '--card-border-hover': '1px solid transparent',
      '--input-border': '1px solid transparent',
      '--sidebar-border': '1px solid transparent',
      '--divider-color': '#c7c7c7',
      // text
      '--accent': '#53616f',
      '--accent-light': '#d3dae2',
      '--text-primary': '#2f3438',
      '--text-secondary': '#626a70',
      '--text-tertiary': '#8e969c',
      '--danger': '#b34b4b',
      // neumorphic shadows: REAL grey values, NOT rgba overlays
      // CONVEX (raised cards): light top-left, dark bottom-right
      '--shadow': '-8px -8px 16px #ffffff, 8px 8px 16px #bebebe',
      '--shadow-lg': '-14px -14px 28px #ffffff, 14px 14px 28px #b8b8b8',
      '--row-shadow': '-6px -6px 12px #ffffff, 6px 6px 12px #bebebe',
      '--card-shadow-hover': '-10px -10px 20px #ffffff, 10px 10px 20px #b8b8b8',
      '--tree-hover-shadow': '-4px -4px 8px #ffffff, 4px 4px 8px #bebebe',
      // CONCAVE (pressed inputs): inset — dark top-left, light bottom-right
      '--input-shadow': 'inset 4px 4px 8px #bebebe, inset -4px -4px 8px #ffffff',
      '--input-shadow-focus': 'inset 4px 4px 8px #bebebe, inset -4px -4px 8px #ffffff, 0 0 0 2px rgba(83,97,111,0.25), 0 0 0 6px rgba(83,97,111,0.12)',
      // raised icon chip
      '--row-icon-bg': '#e6e6e6',
      '--row-icon-shadow': '-3px -3px 6px #ffffff, 3px 3px 6px #bebebe',
      // shape
      '--row-icon-radius': '10px',
      '--card-radius': '16px',
      '--card-gap': '8px',
      '--checkbox-border': '1px solid #b8b8b8',
      // misc
      '--overlay': 'rgba(47,52,56,0.22)',
      '--search-highlight': 'rgba(83,97,111,0.18)',
      '--folder-icon-fill': '#cbd2d9',
      '--folder-icon-stroke': '#53616f',
    }),
  },
]

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value)
  }
}
