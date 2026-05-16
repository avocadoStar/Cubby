import { useState, type FormEvent } from 'react'
import { useFolderStore } from '../stores/folderStore'
import FormModal from './FormModal'
import Input from './Input'

export default function RenameFolderModal({ folderId, onClose }: {
  folderId: string
  onClose: () => void
}) {
  const folder = useFolderStore.getState().folderMap.get(folderId)
  const [name, setName] = useState(folder?.name ?? '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
    <FormModal
      title="重命名文件夹"
      onClose={() => { if (!saving) onClose() }}
      onSubmit={handleSubmit}
      submitLabel="保存"
      submitDisabled={saving || !name.trim()}
      submitLoading={saving}
      width="420px"
    >
      <Input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        className="h-11 px-4 mb-5"
      />
    </FormModal>
  )
}
