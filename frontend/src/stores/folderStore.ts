import { create } from 'zustand'
import type { Folder } from '../types'
import { api } from '../services/api'

interface FolderState {
  folderMap: Map<string, Folder>
  childrenMap: Map<string | null, string[]>
  expandedIds: Set<string>
  selectedId: string | null
  visibleNodes: { node: Folder; depth: number }[]
  loadChildren: (parentId: string | null) => Promise<void>
  toggleExpand: (id: string) => void
  select: (id: string | null) => void
  rebuildVisible: () => void
  create: (name: string, parentId: string | null) => Promise<void>
}

export const useFolderStore = create<FolderState>((set, get) => ({
  folderMap: new Map(),
  childrenMap: new Map(),
  expandedIds: new Set(),
  selectedId: null,
  visibleNodes: [],

  loadChildren: async (parentId) => {
    const folders = await api.getFolders(parentId)
    set((state) => {
      const folderMap = new Map(state.folderMap)
      const childrenMap = new Map(state.childrenMap)
      const ids: string[] = []
      for (const f of folders) {
        folderMap.set(f.id, f)
        ids.push(f.id)
      }
      childrenMap.set(parentId, ids)
      return { folderMap, childrenMap }
    })
    get().rebuildVisible()
  },

  toggleExpand: (id) => {
    set((state) => {
      const expanded = new Set(state.expandedIds)
      if (expanded.has(id)) {
        expanded.delete(id)
      } else {
        expanded.add(id)
      }
      return { expandedIds: expanded }
    })
    const { childrenMap } = get()
    if (!childrenMap.has(id)) {
      get().loadChildren(id)
    }
    get().rebuildVisible()
  },

  select: (id) => set({ selectedId: id }),

  rebuildVisible: () => {
    const { folderMap, childrenMap, expandedIds } = get()
    const result: { node: Folder; depth: number }[] = []

    function walk(parentId: string | null, depth: number) {
      const children = childrenMap.get(parentId) || []
      for (const id of children) {
        const node = folderMap.get(id)
        if (!node) continue
        result.push({ node, depth })
        if (expandedIds.has(id)) {
          walk(id, depth + 1)
        }
      }
    }
    walk(null, 0)
    set({ visibleNodes: result })
  },

  create: async (name, parentId) => {
    await api.createFolder(name, parentId)
    await get().loadChildren(parentId)
  },
}))
