import { useState, type FocusEvent } from 'react'
import { useFolderStore } from '../stores/folderStore'
import ModalBase from './ModalBase'
import Button from './Button'

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

  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim() || !folder || saving) return
    setSaving(true)
    try {
      await useFolderStore.getState().rename(folderId, name.trim(), folder.version)
      onClose()
    } catch {
      setSaving(false)
    }
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
        <Button variant="secondary" onClick={onClose} disabled={saving}>取消</Button>
        <Button variant="primary" onClick={submit} loading={saving} disabled={!name.trim() || saving}>保存</Button>
      </div>
    </ModalBase>
  )
}
