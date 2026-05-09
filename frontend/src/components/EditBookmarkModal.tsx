import { useState } from 'react'
import type { Bookmark } from '../types'
import { api } from '../services/api'
import ModalBase from './ModalBase'

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
    <ModalBase title="编辑书签" onClose={onClose}>
      <input value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="名称" className="w-full h-11 px-4 rounded outline-none mb-3 bg-input-bg border border-input-border text-app-text shadow-input-base focus:shadow-input-focus transition-shadow" />
      <input value={url} onChange={(e) => setUrl(e.target.value)}
        placeholder="URL" className="w-full h-11 px-4 rounded outline-none mb-5 bg-input-bg border border-input-border text-app-text shadow-input-base focus:shadow-input-focus transition-shadow" />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="h-10 px-5 rounded text-body cursor-default bg-app-card border border-input-border text-app-text shadow-app-base">取消</button>
        <button onClick={handleSave} disabled={!title.trim() || !url.trim()}
          className="h-10 px-5 border-none rounded text-body font-medium cursor-default disabled:opacity-50 bg-app-accent text-text-on-accent shadow-app-base">保存</button>
      </div>
    </ModalBase>
  )
}

