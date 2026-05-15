import { useEffect, useRef } from 'react'
import { useFontSizeStore, type FontSizePreset } from '../stores/fontSizeStore'

const PRESETS: { key: FontSizePreset; label: string; preview: string }[] = [
  { key: 'small',  label: '小',   preview: 'Aa' },
  { key: 'medium', label: '默认', preview: 'Aa' },
  { key: 'large',  label: '大',   preview: 'Aa' },
]

export default function FontSizePopover({ onClose }: { onClose: () => void }) {
  const { preset, setPreset } = useFontSizeStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timeoutId = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handler)
    }
  }, [onClose])

  const idx = PRESETS.findIndex((p) => p.key === preset)

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 z-50 p-4"
      style={{ width: 240, background: 'var(--app-card)', border: 'var(--input-border)', borderRadius: 'var(--card-radius)', boxShadow: 'var(--shadow-lg)' }}
    >
      <div className="text-body font-medium mb-3" style={{ color: 'var(--app-text)' }}>字体大小</div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-body" style={{ color: 'var(--app-text2)' }}>A</span>
        <input
          type="range"
          min={0}
          max={2}
          step={1}
          value={idx}
          className="flex-1 h-1 cursor-pointer"
          style={{ accentColor: 'var(--app-accent)' }}
          onChange={(e) => setPreset(PRESETS[Number(e.target.value)].key)}
        />
        <span className="text-lg font-medium" style={{ color: 'var(--app-text)' }}>A</span>
      </div>

      <div className="flex gap-2 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            className="flex-1 h-8 rounded text-body cursor-pointer border"
            style={{
              borderColor: preset === p.key ? 'var(--app-accent)' : 'var(--app-border)',
              background: preset === p.key ? 'var(--accent-light)' : 'var(--app-bg)',
              color: preset === p.key ? 'var(--app-accent)' : 'var(--app-text)',
              boxShadow: preset === p.key ? 'var(--input-shadow)' : 'var(--shadow)',
              fontWeight: preset === p.key ? 600 : 400,
            }}
            onClick={() => setPreset(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div
        className="text-center py-2 select-none"
        style={{ color: 'var(--app-text2)', borderTop: '1px solid var(--divider-color)', fontSize: 'var(--fs-body)' }}
      >
        预览文本示例 Cubby
      </div>
    </div>
  )
}
