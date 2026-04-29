import { create } from 'zustand'

interface BookmarkStore {
  setViewMode: (mode: 'grid' | 'list') => void
  viewMode: 'grid' | 'list'
}

export const useBookmarkStore = create<BookmarkStore>((set) => ({
  viewMode: 'list',
  setViewMode: (mode) => set({ viewMode: mode }),
}))
