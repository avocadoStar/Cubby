import { useRef, useState, type FormEvent } from 'react'
import { useFolderStore } from '../stores/folderStore'
import ModalBase from './ModalBase'
import Button from './Button'

export default function CreateFolderModal({ parentId, onClose }: { parentId: string | null; onClose: () => void }) {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const { create } = useFolderStore()
  const nameInputRef = useRef<HTMLInputElement>(null)

  const closeModal = (force = false) => {
    if (saving && !force) return
    onClose()
  }

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (saving) return
    if (!name.trim()) {
      setNameError('请输入文件夹名称')
      nameInputRef.current?.focus()
      return
    }
    setSaving(true)
    try {
      await create(name.trim(), parentId)
      closeModal(true)
    } catch (e) {
      setSaving(false)
      throw e
    }
  }

  return (
    <ModalBase title="新建文件夹" onClose={closeModal} width="320px" closeOnEscape={!saving} closeOnOverlayClick={false}>
      <form onSubmit={handleSubmit}>
        <input
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
          className={`w-full h-9 px-3 rounded-input outline-none ${nameError ? 'mb-1' : 'mb-4'} bg-input-bg text-app-text shadow-input-base transition-shadow text-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text2)]`}
          style={{ border: nameError ? '1px solid var(--app-danger)' : 'var(--input-border)' }}
        />
        {nameError && (
          <div className="text-sm mb-4 text-app-danger">
            {nameError}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => closeModal()} disabled={saving}>取消</Button>
          <Button variant="primary" type="submit" loading={saving} disabled={saving || !name.trim()}>创建</Button>
        </div>
      </form>
    </ModalBase>
  )
}


