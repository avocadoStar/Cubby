import { useBookmarkStore } from '../stores/bookmarkStore'

export default function BatchActionBar() {
  const { selectedIds, selectedFolderIds, clearSelection, deleteSelected } = useBookmarkStore()
  const count = selectedIds.size + selectedFolderIds.size
  if (count === 0) return null

  return (
    <div
      role="dialog"
      aria-label="alert dialog"
      className="absolute right-[63px] top-[14px] z-50 flex items-center gap-4 bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 shadow-lg text-[13px]"
    >
      <span className="text-[#1a1a1a]">已选择 {count} 项</span>
      <button
        className="h-7 px-3.5 border-none rounded bg-[#0078D4] text-white text-[13px] font-medium cursor-default"
        onClick={deleteSelected}
      >
        删除
      </button>
      <button
        className="h-7 px-3.5 border border-[#d1d1d1] rounded bg-white text-[#1a1a1a] text-[13px] cursor-default"
        onClick={clearSelection}
      >
        取消
      </button>
    </div>
  )
}
