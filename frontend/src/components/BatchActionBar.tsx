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
      className="absolute right-[63px] top-[14px] z-50 flex items-center gap-4 bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 shadow-lg text-body"
    >
      {deleting ? (
        <>
          <div className="w-4 h-4 border-2 border-[#0078D4] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#666]">正在删除…</span>
          <button
            className="h-7 px-3.5 border border-[#d1d1d1] rounded bg-[#f5f5f5] text-[#aaa] text-body cursor-default"
            disabled
          >
            取消
          </button>
        </>
      ) : (
        <>
          <span className="text-[#1a1a1a]">已选择 {count} 项</span>
          <button
            className="h-7 px-3.5 border-none rounded bg-[#0078D4] text-white text-body font-medium cursor-default"
            onClick={handleDelete}
          >
            删除
          </button>
          <button
            className="h-7 px-3.5 border border-[#d1d1d1] rounded bg-white text-[#1a1a1a] text-body cursor-default"
            onClick={clearSelection}
          >
            取消
          </button>
        </>
      )}
    </div>
  )
}
