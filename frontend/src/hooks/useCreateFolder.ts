import { useState } from 'react'
import { useFolderStore } from '../stores/folderStore'

export function useCreateFolder(parentId: string | null, onCreated: () => void) {
  const [folderName, setFolderName] = useState('')
  const [saving, setSaving] = useState(false)
  const { create } = useFolderStore()

  const createFolder = async () => {
    if (saving) return
    if (!folderName.trim()) return
    setSaving(true)
    try {
      await create(folderName.trim(), parentId)
      onCreated()
    } catch (e) {
      setSaving(false)
      throw e
    }
  }

  const reset = () => {
    setFolderName('')
    setSaving(false)
  }

  return { folderName, saving, setFolderName, createFolder, reset }
}
