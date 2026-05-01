import { create } from 'zustand'
import type { Folder } from '../types'

export type DndSource = 'sidebar' | 'main' | null

interface DndState {
  activeId: string | null
  activeFolder: Folder | null
  overId: string | null
  dropPosition: 'before' | 'inside' | 'after' | null
  indicatorRect: { top: number; left: number; width: number } | null
  source: DndSource
  setActive: (id: string, folder: Folder, source: DndSource) => void
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
  source: null,

  setActive: (id, folder, source) =>
    set({ activeId: id, activeFolder: folder, source, overId: null, dropPosition: null, indicatorRect: null }),

  setOver: (id, position, rect) =>
    set({ overId: id, dropPosition: position, indicatorRect: rect ?? null }),

  clearDrag: () =>
    set({ activeId: null, activeFolder: null, source: null, overId: null, dropPosition: null, indicatorRect: null }),
}))
