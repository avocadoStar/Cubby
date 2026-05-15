import { useState, type FocusEvent } from 'react'
import { useFolderStore } from '../stores/folderStore'
import ModalBase from './ModalBase'

const INPUT_STYLE: React.CSSProperties = {
  border: 'var(--input-border)',
  boxShadow: 'var(--input-shadow)',
  background: 'var(--input-bg)',
  color: 'var(--app-text)',
  fontSize: 'var(--fs-body)',
}

function handleFocus(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.boxShadow = 'var(--input-shadow-focus)'
}

function handleBlur(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.boxShadow = 'var(--input-shadow)'
}

export default function RenameFolderModal({ folderId, onClose }: {
  folderId: string
  onClose: () => void
}) {
  const folder = useFolderStore.getState().folderMap.get(folderId)
  const [name, setName] = useState(folder?.name ?? '')

  const submit = async () => {
    if (!name.trim() || !folder) return
    await useFolderStore.getState().rename(folderId, name.trim(), folder.version)
    onClose()
  }

  if (!folder) return null

  return (
    <ModalBase title="重命名文件夹" onClose={onClose} width="420px" closeOnEscape>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        className="w-full h-11 px-4 rounded outline-none mb-5"
        style={INPUT_STYLE}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="h-10 px-5 rounded text-body cursor-default"
          style={{ border: 'var(--input-border)', boxShadow: 'var(--shadow)', background: 'var(--app-card)', color: 'var(--app-text)' }}>
          取消
        </button>
        <button onClick={submit} disabled={!name.trim()} className="h-10 px-5 border-none rounded text-body font-medium cursor-default disabled:opacity-50"
          style={{ background: 'var(--app-accent)', boxShadow: 'var(--shadow)', color: 'var(--text-on-accent)' }}>
          保存
        </button>
      </div>
    </ModalBase>
  )
}
