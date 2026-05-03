import { useState } from 'react'
import { useFolderStore } from '../stores/folderStore'

export default function CreateFolderModal({ parentId, onClose }: { parentId: string | null; onClose: () => void }) {
  const [name, setName] = useState('')
  const { create } = useFolderStore()

  const handleSubmit = async () => {
    if (!name.trim()) return
    await create(name.trim(), parentId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="bg-white border border-[#e0e0e0] rounded-lg shadow-xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-4">新建文件夹</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="文件夹名称"
          className="w-full h-9 px-3 border border-[#d1d1d1] rounded text-sm outline-none focus:border-[#0078D4] mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-8 px-4 border border-[#d1d1d1] rounded bg-white text-body text-[#1a1a1a] cursor-default">取消</button>
          <button onClick={handleSubmit} disabled={!name.trim()} className="h-8 px-4 border-none rounded bg-[#0078D4] text-white text-body font-medium cursor-default disabled:opacity-50">创建</button>
        </div>
      </div>
    </div>
  )
}
