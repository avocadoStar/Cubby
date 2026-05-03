import { useEffect, useRef } from 'react'
import { useThemeStore } from '../stores/themeStore'
import { themes } from '../lib/themes'

export default function ThemeSwitcher({ onClose }: { onClose: () => void }) {
  const { themeId, setTheme } = useThemeStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#e0e0e0] rounded-lg shadow-lg p-4 overflow-auto"
      style={{ width: 420, maxHeight: 'calc(100vh - 120px)', background: 'var(--card-bg)', borderColor: 'var(--border)' }}
    >
      <div className="text-body font-medium mb-3" style={{ color: 'var(--text-primary)' }}>主题</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {themes.map((t) => (
          <button
            key={t.id}
            className="text-left px-3 py-2 rounded cursor-pointer border-none flex items-center gap-2"
            style={{
              background: themeId === t.id ? 'var(--accent-light)' : 'var(--hover)',
              color: 'var(--text-primary)',
              fontSize: 'var(--fs-body)',
              outline: themeId === t.id ? '1px solid var(--accent)' : 'none',
            }}
            onClick={() => { setTheme(t.id); onClose() }}
          >
            <span
              className="flex-shrink-0 rounded"
              style={{
                width: 14, height: 14,
                background: t.vars['--accent'],
                boxShadow: `0 0 0 2px ${t.vars['--card-bg']}, 0 0 0 3px ${t.vars['--border']}`,
              }}
            />
            <span className="truncate" style={{ fontSize: 'var(--fs-body)' }}>{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
