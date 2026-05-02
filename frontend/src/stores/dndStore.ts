import { create } from 'zustand'

export type DndSource = 'sidebar' | 'main' | null

export interface ActiveDragItem {
  id: string
  title: string
  kind: 'folder' | 'bookmark'
  parentId: string | null
  version: number
}

interface DndState {
  activeId: string | null
  activeItem: ActiveDragItem | null
  overId: string | null
  dropPosition: 'before' | 'inside' | 'after' | null
  indicatorRect: { top: number; left: number; width: number } | null
  source: DndSource
  setActive: (id: string, item: ActiveDragItem, source: DndSource) => void
  setOver: (
    id: string | null,
    position: 'before' | 'inside' | 'after' | null,
    rect?: { top: number; left: number; width: number } | null,
  ) => void
  clearDrag: () => void
}

export const useDndStore = create<DndState>((set) => ({
  activeId: null,
  activeItem: null,
  overId: null,
  dropPosition: null,
  indicatorRect: null,
  source: null,

  setActive: (id, item, source) =>
    set({ activeId: id, activeItem: item, source, overId: null, dropPosition: null, indicatorRect: null }),

  setOver: (id, position, rect) =>
    set({ overId: id, dropPosition: position, indicatorRect: rect ?? null }),

  clearDrag: () =>
    set({ activeId: null, activeItem: null, source: null, overId: null, dropPosition: null, indicatorRect: null }),
}))
