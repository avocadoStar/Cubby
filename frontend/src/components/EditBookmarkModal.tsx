import { useState, type FormEvent } from 'react'
import type { Bookmark } from '../types'
import { api } from '../services/api'
import { useBookmarkStore } from '../stores/bookmarkStore'
import ModalBase from './ModalBase'
import Button from './Button'

export default function EditBookmarkModal({ bookmark, onClose, onSaved }: {
  bookmark: Bookmark
  onClose: () => void
  onSaved?: () => void
}) {
  const upsertOne = useBookmarkStore(s => s.upsertOne)
  const [title, setTitle] = useState(bookmark.title)
  const [url, setUrl] = useState(bookmark.url)
  const [saving, setSaving] = useState(false)

  const closeModal = (force = false) => {
    if (saving && !force) return
    onClose()
  }

  const handleSave = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (saving) return
    if (!title.trim() || !url.trim()) return
    setSaving(true)
    try {
      const updated = await api.updateBookmark(bookmark.id, title.trim(), url.trim(), bookmark.version)
      upsertOne(updated)
      onSaved?.()
      closeModal(true)
    } catch (e) {
      setSaving(false)
      throw e
    }
  }

  return (
    <ModalBase title="编辑书签" onClose={closeModal} width="360px" closeOnEscape={!saving} closeOnOverlayClick={false}>
      <form onSubmit={handleSave}>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          disabled={saving}
          placeholder="名称" className="w-full h-9 px-3 rounded outline-none mb-3 bg-input-bg border border-input-border text-app-text shadow-input-base focus:shadow-input-focus transition-shadow text-sm" />
        <input value={url} onChange={(e) => setUrl(e.target.value)}
          disabled={saving}
          placeholder="URL" className="w-full h-9 px-3 rounded outline-none mb-4 bg-input-bg border border-input-border text-app-text shadow-input-base focus:shadow-input-focus transition-shadow text-sm" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => closeModal()} disabled={saving}>取消</Button>
          <Button variant="primary" type="submit" loading={saving} disabled={saving || !title.trim() || !url.trim()}>保存</Button>
        </div>
      </form>
    </ModalBase>
  )
}

