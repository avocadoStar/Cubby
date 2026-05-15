import { useState, type FormEvent } from 'react'
import type { Bookmark } from '../types'
import { api } from '../services/api'
import { useBookmarkStore } from '../stores/bookmarkStore'
import FormModal from './FormModal'
import Input from './Input'

export default function EditBookmarkModal({ bookmark, onClose, onSaved }: {
  bookmark: Bookmark
  onClose: () => void
  onSaved?: () => void
}) {
  const upsertOne = useBookmarkStore(s => s.upsertOne)
  const [title, setTitle] = useState(bookmark.title)
  const [url, setUrl] = useState(bookmark.url)
  const [saving, setSaving] = useState(false)

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    if (!title.trim() || !url.trim()) return
    setSaving(true)
    try {
      const updated = await api.updateBookmark(bookmark.id, title.trim(), url.trim(), bookmark.version)
      upsertOne(updated)
      onSaved?.()
      onClose()
    } catch (e) {
      setSaving(false)
      throw e
    }
  }

  return (
    <FormModal
      title="编辑书签"
      onClose={() => { if (!saving) onClose() }}
      onSubmit={handleSave}
      submitLabel="保存"
      submitDisabled={saving || !title.trim() || !url.trim()}
      submitLoading={saving}
      width="360px"
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)}
        disabled={saving}
        placeholder="名称" className="mb-3" />
      <Input value={url} onChange={(e) => setUrl(e.target.value)}
        disabled={saving}
        placeholder="URL" />
    </FormModal>
  )
}
