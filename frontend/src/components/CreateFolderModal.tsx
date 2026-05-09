import { useState } from 'react'
import { useFolderStore } from '../stores/folderStore'
import ModalBase from './ModalBase'

export default function CreateFolderModal({ parentId, onClose }: { parentId: string | null; onClose: () => void }) {
  const [name, setName] = useState('')
  const { create } = useFolderStore()

  const handleSubmit = async () => {
    if (!name.trim()) return
    await create(name.trim(), parentId)
    onClose()
  }

  return (
    <ModalBase title="新建文件夹" onClose={onClose} width="320px" closeOnEscape>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="文件夹名称"
        aria-label="文件夹名称"
        className="w-full h-9 px-3 rounded outline-none mb-4 bg-input-bg text-app-text shadow-input-base transition-shadow text-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text2)]"
        style={{ border: 'var(--input-border)' }}
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="h-8 px-4 rounded text-sm cursor-default bg-app-card text-app-text shadow-app-base" style={{ border: 'var(--input-border)' }}>
          取消
        </button>
        <button onClick={handleSubmit} disabled={!name.trim()} className="h-8 px-4 border-none rounded text-sm font-medium cursor-default disabled:opacity-50 bg-app-accent text-text-on-accent shadow-app-base">
          创建
        </button>
      </div>
    </ModalBase>
  )
}


