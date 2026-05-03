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
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const idx = PRESETS.findIndex((p) => p.key === preset)

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#e0e0e0] rounded-lg shadow-lg p-4"
      style={{ width: 240 }}
    >
      <div className="text-body text-[#1a1a1a] font-medium mb-3">字体大小</div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-body text-[#888]">A</span>
        <input
          type="range"
          min={0}
          max={2}
          step={1}
          value={idx}
          className="flex-1 h-1 accent-[#0078D4] cursor-pointer"
          onChange={(e) => setPreset(PRESETS[Number(e.target.value)].key)}
        />
        <span className="text-lg text-[#1a1a1a] font-medium">A</span>
      </div>

      <div className="flex gap-2 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            className="flex-1 h-8 border rounded text-body cursor-default"
            style={{
              borderColor: preset === p.key ? '#0078D4' : '#d1d1d1',
              background: preset === p.key ? '#E5F0FF' : '#fff',
              color: preset === p.key ? '#0078D4' : '#1a1a1a',
              fontWeight: preset === p.key ? 600 : 400,
            }}
            onClick={() => setPreset(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div
        className="text-center text-[#888] py-2 border-t border-[#e8e8e8] select-none"
        style={{ fontSize: `var(--fs-body)` }}
      >
        预览文本示例 Cubby
      </div>
    </div>
  )
}
