import { useState, type CSSProperties, type FocusEvent } from 'react'
import type { Bookmark } from '../types'
import { api } from '../services/api'

const panelStyle: CSSProperties = {
  width: 'min(92vw, 480px)',
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

export default function EditBookmarkModal({ bookmark, onClose, onSaved }: {
  bookmark: Bookmark
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(bookmark.title)
  const [url, setUrl] = useState(bookmark.url)

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) return
    await api.updateBookmark(bookmark.id, title.trim(), url.trim(), bookmark.version)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-title font-semibold mb-5" style={{ color: 'var(--app-text)' }}>编辑书签</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="名称" className="w-full h-11 px-4 rounded outline-none mb-3" style={inputStyle}
          onFocus={handleInputFocus} onBlur={handleInputBlur} />
        <input value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="URL" className="w-full h-11 px-4 rounded outline-none mb-5" style={inputStyle}
          onFocus={handleInputFocus} onBlur={handleInputBlur} />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-5 rounded text-body cursor-default"
            style={secondaryButtonStyle}>取消</button>
          <button onClick={handleSave} disabled={!title.trim() || !url.trim()}
            className="h-10 px-5 border-none rounded text-body font-medium cursor-default disabled:opacity-50"
            style={primaryButtonStyle}>保存</button>
        </div>
      </div>
    </div>
  )
}
