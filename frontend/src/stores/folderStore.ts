import { create } from 'zustand'
import type { Folder } from '../types'
import { api, ConflictError } from '../services/api'
import { useToastStore } from './toastStore'

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
  deleteOne: (id: string) => void
  moveFolder: (
    id: string,
    newParentId: string | null,
    prevId: string | null,
    nextId: string | null,
    version: number,
    sortKey?: string,
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
      // Update parent's has_children flag
      if (parentId !== null) {
        const parent = folderMap.get(parentId)
        if (parent) {
          folderMap.set(parentId, { ...parent, has_children: ids.length > 0 })
        }
      }
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

  deleteOne: (id) => {
    const folder = get().folderMap.get(id)
    if (!folder) return

    // Remove from childrenMap so it disappears from sidebar immediately
    set((s) => {
      const folderMap = new Map(s.folderMap)
      folderMap.delete(id)
      const childrenMap = new Map(s.childrenMap)
      for (const [pid, children] of childrenMap) {
        childrenMap.set(pid, children.filter((cid) => cid !== id))
      }
      return { folderMap, childrenMap }
    })
    get().rebuildVisible()

    let undone = false

    const doUndo = () => {
      if (undone) return
      undone = true
      api.restoreFolder(id).then((restored) => {
        if (restored) {
          set((s) => {
            const folderMap = new Map(s.folderMap)
            folderMap.set(id, restored)
            return { folderMap }
          })
          // Reload parent to refresh children ordering
          get().loadChildren(restored.parent_id)
          get().rebuildVisible()
        }
      }).catch(() => {
        // Re-add locally if restore fails
        set((s) => {
          const folderMap = new Map(s.folderMap)
          folderMap.set(id, folder)
          return { folderMap }
        })
        const parentId = folder.parent_id
        get().loadChildren(parentId)
        get().rebuildVisible()
      })
    }

    // Call delete API immediately
    api.deleteFolder(id).then(() => {
      if (undone) return
      const parentId = folder.parent_id
      get().loadChildren(parentId)
      get().rebuildVisible()
      useToastStore.getState().show({
        message: `已删除 "${folder.name}"`,
        onUndo: doUndo,
      })
    }).catch(() => {
      doUndo()
    })
  },

  moveFolder: async (id, newParentId, prevId, nextId, version, sortKey) => {
    const doMove = async (ver: number) => {
      await api.moveFolder({ id, parent_id: newParentId, prev_id: prevId, next_id: nextId, sort_key: sortKey ?? null, version: ver })

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
