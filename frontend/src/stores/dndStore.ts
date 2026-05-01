import { create } from 'zustand'
import type { Folder } from '../types'

interface DndState {
  activeId: string | null
  activeFolder: Folder | null
  overId: string | null
  dropPosition: 'before' | 'inside' | 'after' | null
  indicatorRect: { top: number; left: number; width: number } | null
  setActive: (id: string, folder: Folder) => void
  setOver: (
    id: string | null,
    position: 'before' | 'inside' | 'after' | null,
    rect?: { top: number; left: number; width: number } | null,
  ) => void
  clearDrag: () => void
}

export const useDndStore = create<DndState>((set) => ({
  activeId: null,
  activeFolder: null,
  overId: null,
  dropPosition: null,
  indicatorRect: null,

  setActive: (id, folder) =>
    set({ activeId: id, activeFolder: folder, overId: null, dropPosition: null, indicatorRect: null }),

  setOver: (id, position, rect) =>
    set({ overId: id, dropPosition: position, indicatorRect: rect ?? null }),

  clearDrag: () =>
    set({ activeId: null, activeFolder: null, overId: null, dropPosition: null, indicatorRect: null }),
}))
