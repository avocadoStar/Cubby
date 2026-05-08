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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="p-6 w-80" style={{ background: 'var(--app-card)', border: 'var(--input-border)', borderRadius: 'var(--card-radius)', boxShadow: 'var(--shadow-lg)' }} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--app-text)' }}>新建文件夹</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="文件夹名称"
          className="w-full h-9 px-3 rounded text-sm outline-none mb-4"
          style={{
            border: 'var(--input-border)',
            boxShadow: 'var(--input-shadow)',
            background: 'var(--input-bg)',
            color: 'var(--app-text)',
          }}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-8 px-4 rounded text-body cursor-default"
            style={{ border: 'var(--input-border)', boxShadow: 'var(--shadow)', background: 'var(--app-card)', color: 'var(--app-text)' }}>
            取消
          </button>
          <button onClick={handleSubmit} disabled={!name.trim()} className="h-8 px-4 border-none rounded text-white text-body font-medium cursor-default disabled:opacity-50"
            style={{ background: 'var(--app-accent)', boxShadow: 'var(--shadow)' }}>
            创建
          </button>
        </div>
      </div>
    </div>
  )
}
