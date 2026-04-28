import { create } from 'zustand'
import type { Folder } from '../types'
import * as api from '../services/api'

interface FolderStore {
  folders: Folder[]
  selectedFolderId: string | null
  loading: boolean
  fetchFolders: () => Promise<void>
  createFolder: (name: string, parentId?: string | null) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  updateFolder: (id: string, name: string, parentId?: string | null) => Promise<void>
  selectFolder: (id: string | null) => void
}

export const useFolderStore = create<FolderStore>((set, get) => ({
  folders: [],
  selectedFolderId: null,
  loading: false,
  fetchFolders: async () => {
    set({ loading: true })
    const folders = await api.getFolders()
    set({ folders, loading: false })
  },
  createFolder: async (name, parentId) => {
    await api.createFolder({ name, parent_id: parentId })
    await get().fetchFolders()
  },
  deleteFolder: async (id) => {
    await api.deleteFolder(id)
    await get().fetchFolders()
  },
  updateFolder: async (id, name, parentId) => {
    await api.updateFolder(id, { name, parent_id: parentId })
    await get().fetchFolders()
  },
  selectFolder: (id) => set({ selectedFolderId: id }),
}))
