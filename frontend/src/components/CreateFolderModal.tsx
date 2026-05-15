import { useRef, useState, type FormEvent } from 'react'
import { useFolderStore } from '../stores/folderStore'
import FormModal from './FormModal'
import Input from './Input'

export default function CreateFolderModal({ parentId, onClose }: { parentId: string | null; onClose: () => void }) {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const { create } = useFolderStore()
  const nameInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    if (!name.trim()) {
      setNameError('请输入文件夹名称')
      nameInputRef.current?.focus()
      return
    }
    setSaving(true)
    try {
      await create(name.trim(), parentId)
      onClose()
    } catch (e) {
      setSaving(false)
      throw e
    }
  }

  return (
    <FormModal
      title="新建文件夹"
      onClose={() => { if (!saving) onClose() }}
      onSubmit={handleSubmit}
      submitLabel="创建"
      submitDisabled={saving || !name.trim()}
      submitLoading={saving}
      width="320px"
    >
      <Input
        ref={nameInputRef}
        value={name}
        disabled={saving}
        onChange={(e) => {
          setNameError('')
          setName(e.target.value)
        }}
        placeholder="文件夹名称"
        aria-label="文件夹名称"
        aria-invalid={Boolean(nameError)}
        error={!!nameError}
      />
      {nameError && (
        <div className="text-sm mb-4 text-app-danger">
          {nameError}
        </div>
      )}
    </FormModal>
  )
}
