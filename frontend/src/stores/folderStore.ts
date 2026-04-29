import { create } from 'zustand'

interface FolderStore {
  selectFolder: (id: string | null) => void
  selectedFolderId: string | null
}

export const useFolderStore = create<FolderStore>((set) => ({
  selectedFolderId: null,
  selectFolder: (id) => set({ selectedFolderId: id }),
}))
