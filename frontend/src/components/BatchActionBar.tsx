import { useState } from 'react'
import { useBookmarkStore } from '../stores/bookmarkStore'

export default function BatchActionBar() {
  const { selectedIds, selectedFolderIds, clearSelection, deleteSelected } = useBookmarkStore()
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
          <button
            className="h-7 px-3.5 rounded text-body cursor-default"
            style={{ border: 'var(--input-border)', boxShadow: 'var(--shadow)', background: 'var(--app-card)', color: 'var(--app-text3)' }}
            disabled
          >
            取消
          </button>
        </>
      ) : (
        <>
          <span style={{ color: 'var(--app-text)' }}>已选择 {count} 项</span>
          <button
            className="h-7 px-3.5 border-none rounded text-white text-body font-medium cursor-default"
            style={{ background: 'var(--app-accent)', boxShadow: 'var(--shadow)' }}
            onClick={handleDelete}
          >
            删除
          </button>
          <button
            className="h-7 px-3.5 rounded text-body cursor-default"
            style={{ border: 'var(--input-border)', boxShadow: 'var(--shadow)', background: 'var(--app-card)', color: 'var(--app-text)' }}
            onClick={clearSelection}
          >
            取消
          </button>
        </>
      )}
    </div>
  )
}
