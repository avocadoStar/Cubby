export interface ThemeVars {
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
}

export interface Theme {
  id: string
  name: string
  vars: ThemeVars
}

const F: ThemeVars = {
  '--bg': '#FAFAFA', '--card-bg': '#FFFFFF', '--border': '#E0E0E0', '--border-hover': '#CCCCCC',
  '--hover': '#F5F5F5', '--accent': '#0078D4', '--accent-light': '#E5F0FF',
  '--text-primary': '#1a1a1a', '--text-secondary': '#888', '--text-tertiary': '#AAA',
  '--danger': '#cc3333', '--note-hover': 'rgba(0,0,0,0.06)', '--note-bg': '#F8F8F8',
  '--shadow': '0 1px 2px rgba(0,0,0,0.04)', '--shadow-lg': '0 2px 8px rgba(0,0,0,0.1)',
  '--overlay': 'rgba(0,0,0,0.15)', '--search-highlight': '#FFF2A8',
  '--folder-icon-fill': '#F0C54F', '--folder-icon-stroke': '#D4A830',
  '--card-radius': '8px', '--card-gap': '3px',
  '--card-border': '1px solid #E0E0E0', '--card-border-hover': '1px solid #CCCCCC',
  '--card-shadow-hover': '0 1px 2px rgba(0,0,0,0.04)',
}

export const themes: Theme[] = [
  { id: 'fluent-card', name: 'Fluent · Card', vars: { ...F } },

  { id: 'dark-pro', name: 'Dark · Pro', vars: {
    '--bg': '#141416', '--card-bg': '#1C1C20', '--border': '#2A2A30', '--border-hover': '#3A3A42',
    '--hover': '#24242A', '--accent': '#60CDFF', '--accent-light': 'rgba(96,205,255,0.12)',
    '--text-primary': '#E8E8EC', '--text-secondary': '#8A8A94', '--text-tertiary': '#4A4A52',
    '--danger': '#FF6B6B', '--note-hover': 'rgba(255,255,255,0.06)', '--note-bg': '#1A1A1E',
    '--shadow': '0 1px 3px rgba(0,0,0,0.3)', '--shadow-lg': '0 4px 16px rgba(0,0,0,0.4)',
    '--overlay': 'rgba(0,0,0,0.5)', '--search-highlight': 'rgba(96,205,255,0.2)',
    '--folder-icon-fill': '#F0C54F', '--folder-icon-stroke': '#D4A830',
    '--card-radius': '8px', '--card-gap': '3px',
    '--card-border': '1px solid #2A2A30', '--card-border-hover': '1px solid #3A3A42',
    '--card-shadow-hover': '0 1px 3px rgba(0,0,0,0.3)',
  }},

  { id: 'bento-modern', name: 'Bento · Modern', vars: {
    '--bg': '#F1F4F8', '--card-bg': 'var(--card-bg)', '--border': '#E2E6EC', '--border-hover': '#CBD0D8',
    '--hover': '#F7F8FA', '--accent': '#6366F1', '--accent-light': '#EEF2FF',
    '--text-primary': '#1E293B', '--text-secondary': '#94A3B8', '--text-tertiary': '#CBD5E1',
    '--danger': '#EF4444', '--note-hover': '#F1F4FF', '--note-bg': '#F8F9FC',
    '--shadow': '0 1px 2px rgba(0,0,0,0.04)', '--shadow-lg': '0 4px 12px rgba(99,102,241,0.1)',
    '--overlay': 'rgba(0,0,0,0.1)', '--search-highlight': 'rgba(99,102,241,0.15)',
    '--folder-icon-fill': '#F0C54F', '--folder-icon-stroke': '#D4A830',
    '--card-radius': '10px', '--card-gap': '4px',
    '--card-border': '1px solid #E2E6EC', '--card-border-hover': '1px solid #6366F1',
    '--card-shadow-hover': '0 2px 8px rgba(99,102,241,0.08)',
  }},

  { id: 'neumorphism', name: 'Neumorphism', vars: {
    '--bg': '#E8ECF1', '--card-bg': '#E8ECF1', '--border': 'transparent', '--border-hover': 'transparent',
    '--hover': '#E8ECF1', '--accent': '#5B7FFF', '--accent-light': 'rgba(91,127,255,0.1)',
    '--text-primary': '#2D3748', '--text-secondary': '#718096', '--text-tertiary': '#A0AEC0',
    '--danger': '#E53E3E', '--note-hover': '#E8ECF1', '--note-bg': '#E8ECF1',
    '--shadow': '3px 3px 7px rgba(0,0,0,0.08), -3px -3px 7px rgba(255,255,255,0.7)',
    '--shadow-lg': '4px 4px 10px rgba(0,0,0,0.1), -4px -4px 10px rgba(255,255,255,0.8)',
    '--overlay': 'rgba(0,0,0,0.1)', '--search-highlight': 'rgba(91,127,255,0.15)',
    '--folder-icon-fill': '#5B7FFF', '--folder-icon-stroke': '#4A6AE0',
    '--card-radius': '12px', '--card-gap': '8px',
    '--card-border': 'none', '--card-border-hover': 'none',
    '--card-shadow-hover': '4px 4px 10px rgba(0,0,0,0.1), -4px -4px 10px rgba(255,255,255,0.8)',
  }},

  { id: 'claymorphism', name: 'Claymorphism', vars: {
    '--bg': '#FFF5F7', '--card-bg': 'var(--card-bg)', '--border': 'transparent', '--border-hover': 'transparent',
    '--hover': '#FFF0F3', '--accent': '#DB2777', '--accent-light': '#FDF2F8',
    '--text-primary': '#4A1D2A', '--text-secondary': '#BE7B8D', '--text-tertiary': '#E9C4D0',
    '--danger': '#DC2626', '--note-hover': 'rgba(219,39,119,0.06)', '--note-bg': '#FFF0F3',
    '--shadow': '0 6px 12px -4px rgba(219,39,119,0.12), 0 2px 4px -2px rgba(219,39,119,0.06)',
    '--shadow-lg': '0 8px 16px -4px rgba(219,39,119,0.16)',
    '--overlay': 'rgba(219,39,119,0.08)', '--search-highlight': 'rgba(219,39,119,0.1)',
    '--folder-icon-fill': '#F472B6', '--folder-icon-stroke': '#DB2777',
    '--card-radius': '16px', '--card-gap': '6px',
    '--card-border': 'none', '--card-border-hover': 'none',
    '--card-shadow-hover': '0 8px 16px -4px rgba(219,39,119,0.16), 0 3px 6px -2px rgba(219,39,119,0.08)',
  }},

  { id: 'minimalism', name: 'Minimalism', vars: {
    '--bg': 'var(--card-bg)', '--card-bg': 'var(--card-bg)', '--border': '#F0F0F0', '--border-hover': '#E0E0E0',
    '--hover': 'var(--bg)', '--accent': '#333333', '--accent-light': 'var(--hover)',
    '--text-primary': '#1a1a1a', '--text-secondary': '#999', '--text-tertiary': '#DDD',
    '--danger': 'var(--danger)', '--note-hover': 'rgba(0,0,0,0.03)', '--note-bg': 'var(--bg)',
    '--shadow': 'none', '--shadow-lg': 'none',
    '--overlay': 'rgba(0,0,0,0.05)', '--search-highlight': '#FFF2A8',
    '--folder-icon-fill': '#F0C54F', '--folder-icon-stroke': '#D4A830',
    '--card-radius': '0', '--card-gap': '0',
    '--card-border': 'none', '--card-border-hover': 'none',
    '--card-shadow-hover': 'none',
  }},

  { id: 'brutalism', name: 'Brutalism', vars: {
    '--bg': 'var(--card-bg)', '--card-bg': 'var(--card-bg)', '--border': '#000000', '--border-hover': '#000000',
    '--hover': '#FFED00', '--accent': '#FF0055', '--accent-light': '#FFED00',
    '--text-primary': '#000000', '--text-secondary': '#555555', '--text-tertiary': '#CCCCCC',
    '--danger': '#FF0055', '--note-hover': '#FFED00', '--note-bg': '#FFFBE6',
    '--shadow': 'none', '--shadow-lg': '4px 4px 0 #000',
    '--overlay': 'rgba(0,0,0,0.3)', '--search-highlight': '#FFED00',
    '--folder-icon-fill': '#000000', '--folder-icon-stroke': '#000000',
    '--card-radius': '0', '--card-gap': '4px',
    '--card-border': '2px solid #000', '--card-border-hover': '2px solid #000',
    '--card-shadow-hover': '3px 3px 0 #000',
  }},

  { id: 'glass-dark', name: 'Glass · Dark', vars: {
    '--bg': '#0F0F1A', '--card-bg': 'rgba(255,255,255,0.06)', '--border': 'rgba(255,255,255,0.08)',
    '--border-hover': 'rgba(255,255,255,0.14)', '--hover': 'rgba(255,255,255,0.1)',
    '--accent': '#A78BFA', '--accent-light': 'rgba(167,139,250,0.15)',
    '--text-primary': '#F0F0FF', '--text-secondary': 'rgba(255,255,255,0.5)',
    '--text-tertiary': 'rgba(255,255,255,0.2)', '--danger': '#FF6B6B',
    '--note-hover': 'rgba(255,255,255,0.08)', '--note-bg': 'rgba(255,255,255,0.04)',
    '--shadow': 'none', '--shadow-lg': '0 8px 32px rgba(0,0,0,0.3)',
    '--overlay': 'rgba(0,0,0,0.5)', '--search-highlight': 'rgba(167,139,250,0.2)',
    '--folder-icon-fill': '#A78BFA', '--folder-icon-stroke': '#8B5CF6',
    '--card-radius': '10px', '--card-gap': '4px',
    '--card-border': '1px solid rgba(255,255,255,0.08)', '--card-border-hover': '1px solid rgba(167,139,250,0.5)',
    '--card-shadow-hover': '0 0 20px rgba(167,139,250,0.1)',
  }},

  { id: 'skeuomorphism', name: 'Skeuomorphism', vars: {
    '--bg': '#D4C5B9', '--card-bg': '#EDE4D8', '--border': '#B8A99A', '--border-hover': '#A09080',
    '--hover': '#F5EFE7', '--accent': '#8B6914', '--accent-light': 'rgba(139,105,20,0.1)',
    '--text-primary': '#3D2B1F', '--text-secondary': '#8B7355', '--text-tertiary': '#C4B19E',
    '--danger': '#8B2500', '--note-hover': 'rgba(139,105,20,0.08)', '--note-bg': '#EDE4D8',
    '--shadow': '0 1px 0 rgba(255,255,255,0.5), 0 -1px 0 rgba(0,0,0,0.1)',
    '--shadow-lg': '0 3px 6px rgba(0,0,0,0.15)',
    '--overlay': 'rgba(0,0,0,0.2)', '--search-highlight': 'rgba(139,105,20,0.2)',
    '--folder-icon-fill': '#8B6914', '--folder-icon-stroke': '#6B4F10',
    '--card-radius': '4px', '--card-gap': '3px',
    '--card-border': '1px solid #B8A99A', '--card-border-hover': '1px solid #A09080',
    '--card-shadow-hover': '0 2px 4px rgba(0,0,0,0.15)',
  }},

  { id: 'flat-design', name: 'Flat Design', vars: {
    '--bg': '#F0F0F0', '--card-bg': 'var(--card-bg)', '--border': '#E8E8E8', '--border-hover': '#D0D0D0',
    '--hover': '#F8F8F8', '--accent': '#E53935', '--accent-light': '#FFEBEE',
    '--text-primary': '#333333', '--text-secondary': '#999999', '--text-tertiary': '#DDDDDD',
    '--danger': '#E53935', '--note-hover': 'rgba(229,57,53,0.06)', '--note-bg': 'var(--card-bg)',
    '--shadow': '0 1px 0 rgba(0,0,0,0.04)', '--shadow-lg': '0 2px 8px rgba(0,0,0,0.1)',
    '--overlay': 'rgba(0,0,0,0.1)', '--search-highlight': '#FFEB3B',
    '--folder-icon-fill': '#E53935', '--folder-icon-stroke': '#C62828',
    '--card-radius': '0', '--card-gap': '1px',
    '--card-border': 'none', '--card-border-hover': 'none',
    '--card-shadow-hover': 'none',
  }},

  { id: 'synthwave', name: 'Synthwave', vars: {
    '--bg': '#1A0030', '--card-bg': 'rgba(255,0,128,0.08)', '--border': 'rgba(255,0,128,0.2)',
    '--border-hover': 'rgba(0,255,255,0.4)', '--hover': 'rgba(255,0,128,0.12)',
    '--accent': '#FF00FF', '--accent-light': 'rgba(255,0,255,0.15)',
    '--text-primary': '#FFEEFF', '--text-secondary': 'rgba(255,238,255,0.5)',
    '--text-tertiary': 'rgba(255,238,255,0.2)', '--danger': '#FF3366',
    '--note-hover': 'rgba(255,0,128,0.1)', '--note-bg': 'rgba(255,0,128,0.04)',
    '--shadow': 'none', '--shadow-lg': '0 0 20px rgba(255,0,255,0.2)',
    '--overlay': 'rgba(0,0,0,0.5)', '--search-highlight': 'rgba(0,255,255,0.2)',
    '--folder-icon-fill': '#FF00FF', '--folder-icon-stroke': '#CC00CC',
    '--card-radius': '4px', '--card-gap': '3px',
    '--card-border': '1px solid rgba(255,0,128,0.2)', '--card-border-hover': '1px solid rgba(0,255,255,0.4)',
    '--card-shadow-hover': '0 0 12px rgba(255,0,255,0.15)',
  }},

  { id: 'terminal', name: 'Terminal', vars: {
    '--bg': '#0C0C0C', '--card-bg': '#0C0C0C', '--border': '#1A1A1A', '--border-hover': '#333333',
    '--hover': '#1A1A1A', '--accent': '#00FF41', '--accent-light': 'rgba(0,255,65,0.1)',
    '--text-primary': '#00FF41', '--text-secondary': '#008F11', '--text-tertiary': '#004400',
    '--danger': '#FF3333', '--note-hover': 'rgba(0,255,65,0.06)', '--note-bg': '#0A0A0A',
    '--shadow': 'none', '--shadow-lg': 'none',
    '--overlay': 'rgba(0,0,0,0.5)', '--search-highlight': 'rgba(0,255,65,0.15)',
    '--folder-icon-fill': '#00FF41', '--folder-icon-stroke': '#008F11',
    '--card-radius': '0', '--card-gap': '0',
    '--card-border': 'none', '--card-border-hover': 'none',
    '--card-shadow-hover': 'none',
  }},

  { id: 'zen-wabi-sabi', name: 'Zen · Wabi-Sabi', vars: {
    '--bg': '#F7F3EE', '--card-bg': '#F7F3EE', '--border': '#E8E0D5', '--border-hover': '#D4C8B8',
    '--hover': '#F0EBE4', '--accent': '#8B6F47', '--accent-light': 'rgba(139,111,71,0.08)',
    '--text-primary': '#3D3226', '--text-secondary': '#A89880', '--text-tertiary': '#D4C8B8',
    '--danger': '#A0522D', '--note-hover': 'rgba(139,111,71,0.06)', '--note-bg': '#F2ECE4',
    '--shadow': 'none', '--shadow-lg': 'none',
    '--overlay': 'rgba(0,0,0,0.08)', '--search-highlight': 'rgba(139,111,71,0.12)',
    '--folder-icon-fill': '#8B6F47', '--folder-icon-stroke': '#6B5538',
    '--card-radius': '0', '--card-gap': '0',
    '--card-border': 'none', '--card-border-hover': 'none',
    '--card-shadow-hover': 'none',
  }},

  { id: 'high-contrast', name: 'High Contrast', vars: {
    '--bg': '#000000', '--card-bg': '#000000', '--border': 'var(--card-bg)', '--border-hover': '#FFFF00',
    '--hover': '#FFFF00', '--accent': 'var(--card-bg)', '--accent-light': '#FFFF00',
    '--text-primary': 'var(--card-bg)', '--text-secondary': 'var(--card-bg)', '--text-tertiary': 'var(--card-bg)',
    '--danger': '#FF0000', '--note-hover': '#FFFF00', '--note-bg': '#000000',
    '--shadow': 'none', '--shadow-lg': 'none',
    '--overlay': 'rgba(255,255,255,0.3)', '--search-highlight': '#FFFF00',
    '--folder-icon-fill': 'var(--card-bg)', '--folder-icon-stroke': 'var(--card-bg)',
    '--card-radius': '0', '--card-gap': '4px',
    '--card-border': '2px solid #FFF', '--card-border-hover': '2px solid #FF0',
    '--card-shadow-hover': 'none',
  }},

  { id: 'paper-notebook', name: 'Paper · Notebook', vars: {
    '--bg': '#FFFEF9', '--card-bg': '#FFFEF9', '--border': '#D0E0F0', '--border-hover': '#B0C8E0',
    '--hover': '#F0F4FF', '--accent': '#2563EB', '--accent-light': '#EFF6FF',
    '--text-primary': '#1E293B', '--text-secondary': '#64748B', '--text-tertiary': '#D0E0F0',
    '--danger': '#DC2626', '--note-hover': 'rgba(37,99,235,0.06)', '--note-bg': '#F8FAFF',
    '--shadow': 'none', '--shadow-lg': '0 2px 8px rgba(37,99,235,0.08)',
    '--overlay': 'rgba(0,0,0,0.08)', '--search-highlight': 'rgba(37,99,235,0.12)',
    '--folder-icon-fill': '#2563EB', '--folder-icon-stroke': '#1D4ED8',
    '--card-radius': '2px', '--card-gap': '0',
    '--card-border': 'none', '--card-border-hover': 'none',
    '--card-shadow-hover': 'none',
  }},

  { id: 'vaporwave', name: 'Vaporwave', vars: {
    '--bg': '#1A1A2E', '--card-bg': 'rgba(255,113,206,0.06)', '--border': 'rgba(255,113,206,0.15)',
    '--border-hover': 'rgba(1,205,254,0.3)', '--hover': 'rgba(255,113,206,0.1)',
    '--accent': '#FF71CE', '--accent-light': 'rgba(255,113,206,0.12)',
    '--text-primary': '#E8E8F0', '--text-secondary': 'rgba(232,232,240,0.5)',
    '--text-tertiary': 'rgba(232,232,240,0.2)', '--danger': '#FF477E',
    '--note-hover': 'rgba(1,205,254,0.08)', '--note-bg': 'rgba(1,205,254,0.04)',
    '--shadow': 'none', '--shadow-lg': '0 0 20px rgba(255,113,206,0.15)',
    '--overlay': 'rgba(0,0,0,0.5)', '--search-highlight': 'rgba(1,205,254,0.15)',
    '--folder-icon-fill': '#FF71CE', '--folder-icon-stroke': '#E05AAF',
    '--card-radius': '0', '--card-gap': '2px',
    '--card-border': '1px solid rgba(255,113,206,0.15)', '--card-border-hover': '1px solid rgba(1,205,254,0.3)',
    '--card-shadow-hover': '0 0 15px rgba(255,113,206,0.1)',
  }},

  { id: 'industrial', name: 'Industrial', vars: {
    '--bg': '#2C2C2C', '--card-bg': '#363636', '--border': '#444444', '--border-hover': '#FF6B35',
    '--hover': '#3A3A3A', '--accent': '#FF6B35', '--accent-light': 'rgba(255,107,53,0.1)',
    '--text-primary': '#E0E0E0', '--text-secondary': '#888888', '--text-tertiary': '#555555',
    '--danger': '#FF4444', '--note-hover': 'rgba(255,107,53,0.1)', '--note-bg': '#323232',
    '--shadow': 'none', '--shadow-lg': '0 4px 12px rgba(0,0,0,0.3)',
    '--overlay': 'rgba(0,0,0,0.5)', '--search-highlight': 'rgba(255,107,53,0.15)',
    '--folder-icon-fill': '#FF6B35', '--folder-icon-stroke': '#E55A25',
    '--card-radius': '2px', '--card-gap': '2px',
    '--card-border': '1px solid #444', '--card-border-hover': '1px solid #FF6B35',
    '--card-shadow-hover': 'inset 0 0 0 1px rgba(255,107,53,0.3)',
  }},

  { id: 'gradient-heavy', name: 'Gradient Heavy', vars: {
    '--bg': 'var(--card-bg)', '--card-bg': 'var(--card-bg)', '--border': '#E2E8F0', '--border-hover': '#CBD5E1',
    '--hover': 'rgba(99,102,241,0.05)', '--accent': '#6366F1', '--accent-light': '#EEF2FF',
    '--text-primary': '#1E293B', '--text-secondary': '#94A3B8', '--text-tertiary': '#E2E8F0',
    '--danger': '#EF4444', '--note-hover': 'rgba(99,102,241,0.08)', '--note-bg': 'rgba(99,102,241,0.03)',
    '--shadow': 'none', '--shadow-lg': '0 4px 12px rgba(99,102,241,0.15)',
    '--overlay': 'rgba(0,0,0,0.1)', '--search-highlight': 'rgba(99,102,241,0.1)',
    '--folder-icon-fill': '#6366F1', '--folder-icon-stroke': '#4F46E5',
    '--card-radius': '0', '--card-gap': '0',
    '--card-border': 'none', '--card-border-hover': 'none',
    '--card-shadow-hover': 'none',
  }},

  { id: 'art-deco', name: 'Art Deco', vars: {
    '--bg': '#F8F4E8', '--card-bg': '#FFFDF7', '--border': '#D4C5A0', '--border-hover': '#C4A030',
    '--hover': '#FFF8E7', '--accent': '#B8860B', '--accent-light': 'rgba(184,134,11,0.1)',
    '--text-primary': '#2C1810', '--text-secondary': '#A09070', '--text-tertiary': '#D4C5A0',
    '--danger': '#8B0000', '--note-hover': 'rgba(184,134,11,0.08)', '--note-bg': '#FFF8E7',
    '--shadow': 'none', '--shadow-lg': '0 4px 12px rgba(184,134,11,0.15)',
    '--overlay': 'rgba(0,0,0,0.15)', '--search-highlight': 'rgba(184,134,11,0.2)',
    '--folder-icon-fill': '#B8860B', '--folder-icon-stroke': '#8B6914',
    '--card-radius': '0', '--card-gap': '3px',
    '--card-border': '1px solid #D4C5A0', '--card-border-hover': '1px solid #C4A030',
    '--card-shadow-hover': '0 2px 8px rgba(184,134,11,0.1)',
  }},

  { id: 'cyberpunk', name: 'Cyberpunk', vars: {
    '--bg': '#0D1117', '--card-bg': 'rgba(0,255,255,0.04)', '--border': 'rgba(0,255,255,0.15)',
    '--border-hover': 'rgba(0,255,255,0.3)', '--hover': 'rgba(0,255,255,0.08)',
    '--accent': '#00FFAA', '--accent-light': 'rgba(0,255,170,0.1)',
    '--text-primary': '#C9D1D9', '--text-secondary': 'rgba(201,209,217,0.5)',
    '--text-tertiary': 'rgba(201,209,217,0.2)', '--danger': '#FF3355',
    '--note-hover': 'rgba(0,255,255,0.08)', '--note-bg': 'rgba(0,255,255,0.04)',
    '--shadow': 'none', '--shadow-lg': '0 0 20px rgba(0,255,170,0.1)',
    '--overlay': 'rgba(0,0,0,0.6)', '--search-highlight': 'rgba(0,255,170,0.15)',
    '--folder-icon-fill': '#00FFAA', '--folder-icon-stroke': '#00CC88',
    '--card-radius': '0', '--card-gap': '2px',
    '--card-border': '1px solid rgba(0,255,255,0.15)', '--card-border-hover': '1px solid rgba(0,255,255,0.3)',
    '--card-shadow-hover': '0 0 10px rgba(0,255,170,0.1)',
  }},

  { id: 'organic-nature', name: 'Organic · Nature', vars: {
    '--bg': '#F4F7F0', '--card-bg': '#F4F7F0', '--border': '#C5D5B8', '--border-hover': '#8BAA7A',
    '--hover': '#EEF2EA', '--accent': '#4A7C3F', '--accent-light': 'rgba(74,124,63,0.08)',
    '--text-primary': '#2D3A24', '--text-secondary': '#8B9E7D', '--text-tertiary': '#C5D5B8',
    '--danger': '#CC3333', '--note-hover': 'rgba(74,124,63,0.08)', '--note-bg': '#EDF1E8',
    '--shadow': 'none', '--shadow-lg': '0 4px 12px rgba(74,124,63,0.1)',
    '--overlay': 'rgba(0,0,0,0.08)', '--search-highlight': 'rgba(74,124,63,0.12)',
    '--folder-icon-fill': '#4A7C3F', '--folder-icon-stroke': '#3A6A30',
    '--card-radius': '12px', '--card-gap': '3px',
    '--card-border': 'none', '--card-border-hover': 'none',
    '--card-shadow-hover': 'none',
  }},
]
