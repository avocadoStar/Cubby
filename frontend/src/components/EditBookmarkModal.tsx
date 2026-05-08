import { useState } from 'react'
import type { Bookmark } from '../types'
import { api } from '../services/api'

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

  const inputStyle: React.CSSProperties = {
    border: 'var(--input-border)',
    boxShadow: 'var(--input-shadow)',
    background: 'var(--input-bg)',
    color: 'var(--app-text)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="p-6 w-96" style={{ background: 'var(--app-card)', border: 'var(--input-border)', borderRadius: 'var(--card-radius)', boxShadow: 'var(--shadow-lg)' }} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--app-text)' }}>编辑书签</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="名称" className="w-full h-9 px-3 rounded text-sm outline-none mb-3" style={inputStyle} />
        <input value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="URL" className="w-full h-9 px-3 rounded text-sm outline-none mb-4" style={inputStyle} />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-8 px-4 rounded text-body cursor-default"
            style={{ border: 'var(--input-border)', boxShadow: 'var(--shadow)', background: 'var(--app-card)', color: 'var(--app-text)' }}>取消</button>
          <button onClick={handleSave} disabled={!title.trim() || !url.trim()}
            className="h-8 px-4 border-none rounded text-white text-body font-medium cursor-default disabled:opacity-50"
            style={{ background: 'var(--app-accent)', boxShadow: 'var(--shadow)' }}>保存</button>
        </div>
      </div>
    </div>
  )
}
