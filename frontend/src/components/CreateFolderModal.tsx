import { useRef, useState, type FormEvent } from 'react'
import { useFolderStore } from '../stores/folderStore'
import ModalBase from './ModalBase'

export default function CreateFolderModal({ parentId, onClose }: { parentId: string | null; onClose: () => void }) {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const { create } = useFolderStore()
  const nameInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (!name.trim()) {
      setNameError('请输入文件夹名称')
      nameInputRef.current?.focus()
      return
    }
    await create(name.trim(), parentId)
    onClose()
  }

  return (
    <ModalBase title="新建文件夹" onClose={onClose} width="320px" closeOnEscape closeOnOverlayClick={false}>
      <form onSubmit={handleSubmit}>
        <input
          ref={nameInputRef}
          value={name}
          onChange={(e) => {
            setNameError('')
            setName(e.target.value)
          }}
          placeholder="文件夹名称"
          aria-label="文件夹名称"
          aria-invalid={Boolean(nameError)}
          className={`w-full h-9 px-3 rounded outline-none ${nameError ? 'mb-1' : 'mb-4'} bg-input-bg text-app-text shadow-input-base transition-shadow text-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text2)]`}
          style={{ border: nameError ? '1px solid var(--app-danger)' : 'var(--input-border)' }}
        />
        {nameError && (
          <div className="text-sm mb-4 text-app-danger">
            {nameError}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 px-4 rounded text-sm cursor-default bg-app-card text-app-text shadow-app-base" style={{ border: 'var(--input-border)' }}>
            取消
          </button>
          <button type="submit" className="h-8 px-4 border-none rounded text-sm font-medium cursor-default bg-app-accent text-text-on-accent shadow-app-base">
            创建
          </button>
        </div>
      </form>
    </ModalBase>
  )
}


