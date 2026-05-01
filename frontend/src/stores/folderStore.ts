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
  select: (id: string | null) => Promise<void>
  rebuildVisible: () => void
  create: (name: string, parentId: string | null) => Promise<void>
  moveFolder: (
    id: string,
    newParentId: string | null,
    prevId: string | null,
    nextId: string | null,
    version: number,
  ) => Promise<void>
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

  select: async (id) => {
    // Expand all ancestors so the selected folder is visible in the tree
    if (id) {
      const { folderMap, expandedIds, childrenMap } = get()
      const newExpanded = new Set(expandedIds)
      // Trace parent chain and expand each ancestor
      let current: string | null = id
      const ancestors: string[] = []
      while (current) {
        const f = folderMap.get(current)
        if (!f || !f.parent_id) break
        ancestors.push(f.parent_id)
        current = f.parent_id
      }
      // Load children for each ancestor if not loaded
      for (const ancestorId of ancestors) {
        if (!childrenMap.has(ancestorId)) {
          await get().loadChildren(ancestorId)
        }
        newExpanded.add(ancestorId)
      }
      // Load children for the selected folder
      if (!childrenMap.has(id)) {
        await get().loadChildren(id)
      }
      set({ selectedId: id, expandedIds: newExpanded })
    } else {
      set({ selectedId: null })
    }
    get().rebuildVisible()
  },

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

  moveFolder: async (id, newParentId, prevId, nextId, version) => {
    const { ConflictError } = await import('../services/api')

    const doMove = async (ver: number) => {
      await api.moveFolder({ id, parent_id: newParentId, prev_id: prevId, next_id: nextId, version: ver })

      const { folderMap } = get()
      const folder = folderMap.get(id)
      const oldParentId = folder?.parent_id ?? null

      if (oldParentId !== newParentId) {
        await get().loadChildren(oldParentId)
      }
      await get().loadChildren(newParentId)
      get().rebuildVisible()
    }

    try {
      await doMove(version)
    } catch (e) {
      if (e instanceof ConflictError) {
        // Reload to get fresh versions, then retry once
        const { selectedId } = get()
        await get().loadChildren(selectedId)
        // Also reload newParentId if different from selectedId
        if (newParentId !== selectedId) {
          await get().loadChildren(newParentId)
        }
        get().rebuildVisible()

        const freshFolder = get().folderMap.get(id)
        if (freshFolder) {
          await doMove(freshFolder.version)
          return
        }
      }
      throw e
    }
  },
}))
