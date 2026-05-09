import { useState, type CSSProperties, type FocusEvent } from 'react'
import { useFolderStore } from '../stores/folderStore'

const panelStyle: CSSProperties = {
  width: 'min(92vw, 420px)',
  background: 'var(--app-card)',
  border: 'var(--input-border)',
  borderRadius: 'var(--card-radius)',
  boxShadow: 'var(--shadow-lg)',
  padding: 28,
}

const inputStyle: CSSProperties = {
  border: 'var(--input-border)',
  boxShadow: 'var(--input-shadow)',
  background: 'var(--input-bg)',
  color: 'var(--app-text)',
  fontSize: 'var(--fs-body)',
}

const secondaryButtonStyle: CSSProperties = {
  border: 'var(--input-border)',
  boxShadow: 'var(--shadow)',
  background: 'var(--app-card)',
  color: 'var(--app-text)',
}

const primaryButtonStyle: CSSProperties = {
  background: 'var(--app-accent)',
  boxShadow: 'var(--shadow)',
  color: 'var(--text-on-accent)',
}

function handleInputFocus(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.boxShadow = 'var(--input-shadow-focus)'
}

function handleInputBlur(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.boxShadow = 'var(--input-shadow)'
}

export default function CreateFolderModal({ parentId, onClose }: { parentId: string | null; onClose: () => void }) {
  const [name, setName] = useState('')
  const { create } = useFolderStore()

  const handleSubmit = async () => {
    if (!name.trim()) return
    await create(name.trim(), parentId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-title font-semibold mb-5" style={{ color: 'var(--app-text)' }}>新建文件夹</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="文件夹名称"
          className="w-full h-11 px-4 rounded outline-none mb-5"
          style={inputStyle}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-5 rounded text-body cursor-default"
            style={secondaryButtonStyle}>
            取消
          </button>
          <button onClick={handleSubmit} disabled={!name.trim()} className="h-10 px-5 border-none rounded text-body font-medium cursor-default disabled:opacity-50"
            style={primaryButtonStyle}>
            创建
          </button>
        </div>
      </div>
    </div>
  )
}
