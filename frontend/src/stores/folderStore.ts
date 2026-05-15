import { create } from 'zustand'
import type { Folder } from '../types'
import { api } from '../services/api'
import { computeSortKeyFromNeighbors } from '../lib/sortKeys'
import { buildVisibleNodes, getAncestorChain, rebuildChildrenMapAfterMove } from '../lib/folderTree'
import { showMoveError } from '../lib/errorHandler'
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
    if (id) {
      const ancestors = getAncestorChain(get().folderMap, id)
      set((state) => {
        const expandedIds = new Set(state.expandedIds)
        for (const ancestorId of ancestors) {
          expandedIds.add(ancestorId)
        }
        return { selectedId: id, expandedIds }
      })
      get().rebuildVisible()

      for (const ancestorId of ancestors) {
        if (!get().childrenMap.has(ancestorId)) {
          await get().loadChildren(ancestorId)
        }
      }
      if (!get().childrenMap.has(id)) {
        await get().loadChildren(id)
      }
      set((state) => {
        const expandedIds = new Set(state.expandedIds)
        for (const ancestorId of ancestors) {
          expandedIds.add(ancestorId)
        }
        return { expandedIds }
      })
    } else {
      set({ selectedId: null })
    }
    get().rebuildVisible()
  },

  rebuildVisible: () => {
    const { folderMap, childrenMap, expandedIds } = get()
    set({ visibleNodes: buildVisibleNodes(folderMap, childrenMap, expandedIds) })
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
    const snapshot = {
      folderMap: new Map(get().folderMap),
      childrenMap: new Map(get().childrenMap),
      expandedIds: new Set(get().expandedIds),
      visibleNodes: get().visibleNodes,
    }
    const folder = snapshot.folderMap.get(id)
    const oldParentId = folder?.parent_id ?? null
    const keyFor = (itemId: string | null) => itemId ? snapshot.folderMap.get(itemId)?.sort_key ?? '' : ''
    const optimisticSortKey = sortKey
      ?? computeSortKeyFromNeighbors(keyFor(prevId), keyFor(nextId))

    if (folder && optimisticSortKey) {
      set((state) => {
        const folderMap = new Map(state.folderMap)
        const childrenMap = rebuildChildrenMapAfterMove(state.childrenMap, id, oldParentId, newParentId, prevId, nextId)
        const movedFolder = { ...folder, parent_id: newParentId, sort_key: optimisticSortKey, version }
        folderMap.set(id, movedFolder)

        if (oldParentId !== null) {
          const oldParent = folderMap.get(oldParentId)
          if (oldParent && childrenMap.has(oldParentId)) {
            folderMap.set(oldParentId, { ...oldParent, has_children: (childrenMap.get(oldParentId) ?? []).length > 0 })
          }
        }
        if (newParentId !== null) {
          const newParent = folderMap.get(newParentId)
          if (newParent) {
            folderMap.set(newParentId, { ...newParent, has_children: true })
          }
        }

        return { folderMap, childrenMap }
      })
      get().rebuildVisible()
    }

    try {
      const moved = await api.moveFolder({
        id,
        parent_id: newParentId,
        prev_id: prevId,
        next_id: nextId,
        version,
      })
      set((state) => {
        const folderMap = new Map(state.folderMap)
        folderMap.set(id, moved)
        return { folderMap }
      })
      get().rebuildVisible()
    } catch (e) {
      set(snapshot)
      showMoveError(e)
      throw e
    }
  },
}))
