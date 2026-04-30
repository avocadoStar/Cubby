import { useState } from 'react'
import { Bookmark } from '../types'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="bg-white border border-[#e0e0e0] rounded-lg shadow-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-4">编辑书签</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="名称" className="w-full h-9 px-3 border border-[#d1d1d1] rounded text-sm outline-none focus:border-[#0078D4] mb-3" />
        <input value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="URL" className="w-full h-9 px-3 border border-[#d1d1d1] rounded text-sm outline-none focus:border-[#0078D4] mb-4" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-8 px-4 border border-[#d1d1d1] rounded bg-white text-[13px] cursor-default">取消</button>
          <button onClick={handleSave} disabled={!title.trim() || !url.trim()}
            className="h-8 px-4 border-none rounded bg-[#0078D4] text-white text-[13px] font-medium cursor-default disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  )
}
