import { useState } from 'react'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useSelectionStore } from '../stores/selectionStore'
import Button from './Button'

export default function BatchActionBar() {
  const { selectedIds, selectedFolderIds, clearSelection } = useSelectionStore()
  const { deleteSelected } = useBookmarkStore()
  const [deleting, setDeleting] = useState(false)
  const count = selectedIds.size + selectedFolderIds.size
  if (count === 0) return null

  const handleDelete = async () => {
    setDeleting(true)
    await deleteSelected()
    setDeleting(false)
  }

  return (
    <div
      role="dialog"
      aria-label="alert dialog"
      className="absolute right-[63px] top-[14px] z-50 flex items-center gap-4 px-4 py-3 text-body"
      style={{ background: 'var(--app-card)', border: 'var(--input-border)', borderRadius: 'var(--card-radius)', boxShadow: 'var(--shadow-lg)' }}
    >
      {deleting ? (
        <>
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--app-accent)', borderTopColor: 'transparent' }} />
          <span style={{ color: 'var(--app-text2)' }}>正在删除…</span>
          <Button variant="secondary" size="sm" disabled>取消</Button>
        </>
      ) : (
        <>
          <span style={{ color: 'var(--app-text)' }}>已选择 {count} 项</span>
          <Button variant="primary" size="sm" onClick={handleDelete}>删除</Button>
          <Button variant="secondary" size="sm" onClick={clearSelection}>取消</Button>
        </>
      )}
    </div>
  )
}
