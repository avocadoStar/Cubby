import { create } from 'zustand'
import type { Folder } from '../types'
import * as api from '../services/api'
import { getErrorMessage } from '../utils/errors'

interface FolderStore {
  folders: Folder[]
  selectedFolderId: string | null
  loading: boolean
  error: string | null
  fetchFolders: () => Promise<void>
  createFolder: (name: string, parentId?: string | null) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  updateFolder: (id: string, name: string, parentId?: string | null) => Promise<void>
  selectFolder: (id: string | null) => void
}

function folderExists(folders: Folder[], targetId: string): boolean {
  for (const folder of folders) {
    if (folder.id === targetId) {
      return true
    }
    if (folder.children?.length && folderExists(folder.children, targetId)) {
      return true
    }
  }

  return false
}

export const useFolderStore = create<FolderStore>((set, get) => ({
  folders: [],
  selectedFolderId: null,
  loading: false,
  error: null,
  fetchFolders: async () => {
    set({ loading: true, error: null })

    try {
      const folders = await api.getFolders()
      const nextFolders = Array.isArray(folders) ? folders : []
      const currentSelection = get().selectedFolderId
      const nextSelection =
        currentSelection && !folderExists(nextFolders, currentSelection)
          ? null
          : currentSelection
      set({ folders: nextFolders, loading: false, selectedFolderId: nextSelection })
    } catch (error: unknown) {
      set({ folders: [], error: getErrorMessage(error, '加载文件夹失败'), loading: false })
    }
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
