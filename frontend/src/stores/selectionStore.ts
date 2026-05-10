import { create } from 'zustand'
import type { Bookmark } from '../types'

interface SelectionState {
  selectedIds: Set<string>
  selectedFolderIds: Set<string>
  toggleSelect: (id: string) => void
  toggleFolderSelect: (id: string) => void
  selectAll: (bookmarks: Bookmark[], folderIds?: string[]) => void
  clearSelection: () => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedIds: new Set(),
  selectedFolderIds: new Set(),

  toggleSelect: (id) => {
    set((state) => {
      const next = new Set(state.selectedIds)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return { selectedIds: next }
    })
  },

  toggleFolderSelect: (id) => {
    set((state) => {
      const next = new Set(state.selectedFolderIds)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return { selectedFolderIds: next }
    })
  },

  selectAll: (bookmarks, folderIds) => {
    const all = new Set(bookmarks.map((b) => b.id))
    set({ selectedIds: all, selectedFolderIds: new Set(folderIds ?? []) })
  },

  clearSelection: () => set({ selectedIds: new Set(), selectedFolderIds: new Set() }),
}))
