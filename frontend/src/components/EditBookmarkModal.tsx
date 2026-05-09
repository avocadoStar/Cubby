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
    <ModalBase title="编辑书签" onClose={onClose} width="360px">
      <input value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="名称" className="w-full h-9 px-3 rounded outline-none mb-3 bg-input-bg border border-input-border text-app-text shadow-input-base focus:shadow-input-focus transition-shadow text-sm" />
      <input value={url} onChange={(e) => setUrl(e.target.value)}
        placeholder="URL" className="w-full h-9 px-3 rounded outline-none mb-4 bg-input-bg border border-input-border text-app-text shadow-input-base focus:shadow-input-focus transition-shadow text-sm" />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="h-8 px-4 rounded text-sm cursor-default bg-app-card border border-input-border text-app-text shadow-app-base">取消</button>
        <button onClick={handleSave} disabled={!title.trim() || !url.trim()}
          className="h-8 px-4 border-none rounded text-sm font-medium cursor-default disabled:opacity-50 bg-app-accent text-text-on-accent shadow-app-base">保存</button>
      </div>
    </ModalBase>
  )
}


