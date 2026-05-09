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
      '--bg': '#F7F8FA',
      '--card-bg': '#FFFFFF',
      '--border': '#DDE3EA',
      '--border-hover': '#C9D3DF',
      '--hover': '#EEF3F8',
      '--accent': '#0078D4',
      '--accent-light': '#E7F2FD',
      '--text-on-accent': '#FFFFFF',
      '--text-primary': '#172033',
      '--text-secondary': '#526173',
      '--text-tertiary': '#7B8796',
      '--danger': '#B42318',
      '--danger-bg': '#FDECE9',
      '--success-bg': '#E7F2FD',
      '--note-hover': '#EEF3F8',
      '--note-bg': '#F2F5F8',
      '--shadow': 'none',
      '--shadow-lg': '0 10px 28px rgba(23,32,51,0.10)',
      '--overlay': 'rgba(23,32,51,0.28)',
      '--search-highlight': '#DDEEFF',
      '--folder-icon-fill': '#DCE8F4',
      '--folder-icon-stroke': '#0078D4',
      '--card-radius': '8px',
      '--card-gap': '3px',
      '--card-border': '1px solid #DDE3EA',
      '--card-border-hover': '1px solid #B7C6D8',
      '--card-shadow-hover': '0 1px 2px rgba(23,32,51,0.06)',
      '--row-shadow': 'none',
      '--input-bg': '#F2F5F8',
      '--input-border': '1px solid #DDE3EA',
      '--input-shadow': 'none',
      '--input-shadow-focus': '0 0 0 3px rgba(0,120,212,0.14)',
      '--sidebar-border': '1px solid #DDE3EA',
      '--tree-hover-bg': '#EEF3F8',
      '--tree-hover-shadow': 'none',
      '--row-icon-bg': '#E8EEF5',
      '--row-icon-shadow': 'none',
      '--row-icon-radius': '4px',
      '--checkbox-border': '2px solid #B7C2CE',
      '--divider-color': '#DDE3EA',
    }),
  },
  {
    id: 'neumorphism',
    name: 'Soft Grey',
    vars: createVars({
      '--bg': '#E7EAEE',
      '--card-bg': '#EEF1F4',
      '--border': '#D3D9E1',
      '--border-hover': '#C2CBD6',
      '--hover': '#F3F5F7',
      '--accent': '#516F8F',
      '--accent-light': '#DCE6F0',
      '--text-on-accent': '#FFFFFF',
      '--text-primary': '#26313D',
      '--text-secondary': '#596675',
      '--text-tertiary': '#818C99',
      '--danger': '#9F3A32',
      '--danger-bg': '#F1DEDC',
      '--success-bg': '#DCE6F0',
      '--note-hover': '#F3F5F7',
      '--note-bg': '#EEF1F4',
      '--shadow': '-3px -3px 8px #FFFFFF, 3px 3px 8px #C8CDD4',
      '--shadow-lg': '-8px -8px 20px #FFFFFF, 8px 8px 20px #C4CAD2',
      '--overlay': 'rgba(38,49,61,0.28)',
      '--search-highlight': '#DCE6F0',
      '--folder-icon-fill': '#DCE6F0',
      '--folder-icon-stroke': '#516F8F',
      '--card-radius': '12px',
      '--card-gap': '6px',
      '--card-border': '1px solid #D3D9E1',
      '--card-border-hover': '1px solid #C2CBD6',
      '--card-shadow-hover': '-4px -4px 10px #FFFFFF, 4px 4px 10px #C8CDD4',
      '--row-shadow': 'none',
      '--input-bg': '#E4E8ED',
      '--input-border': '1px solid #D3D9E1',
      '--input-shadow': 'inset 2px 2px 5px #C8CDD4, inset -2px -2px 5px #FFFFFF',
      '--input-shadow-focus': 'inset 2px 2px 5px #C8CDD4, inset -2px -2px 5px #FFFFFF, 0 0 0 3px rgba(81,111,143,0.18)',
      '--sidebar-border': '1px solid #D3D9E1',
      '--tree-hover-bg': '#F3F5F7',
      '--tree-hover-shadow': '-2px -2px 6px #FFFFFF, 2px 2px 6px #C8CDD4',
      '--row-icon-bg': '#E4E8ED',
      '--row-icon-shadow': 'none',
      '--row-icon-radius': '8px',
      '--checkbox-border': '1px solid #AEB8C4',
      '--divider-color': '#D3D9E1',
    }),
  },
]

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value)
  }
}
