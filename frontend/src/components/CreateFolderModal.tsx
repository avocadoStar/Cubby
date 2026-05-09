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
    <ModalBase title="新建文件夹" onClose={onClose}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="文件夹名称"
        className="w-full h-11 px-4 rounded outline-none mb-5 bg-input-bg border border-input-border text-app-text shadow-input-base focus:shadow-input-focus transition-shadow"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="h-10 px-5 rounded text-body cursor-default bg-app-card border border-input-border text-app-text shadow-app-base">
          取消
        </button>
        <button onClick={handleSubmit} disabled={!name.trim()} className="h-10 px-5 border-none rounded text-body font-medium cursor-default disabled:opacity-50 bg-app-accent text-text-on-accent shadow-app-base">
          创建
        </button>
      </div>
    </ModalBase>
  )
}

