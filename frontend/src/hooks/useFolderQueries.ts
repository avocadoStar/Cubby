import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../services/api'
import type { Folder } from '../types'

export const folderQueryKey = ['folders'] as const

export function useFoldersQuery() {
  return useQuery({
    queryKey: folderQueryKey,
    queryFn: async () => {
      const folders = await api.getFolders()
      return Array.isArray(folders) ? folders : []
    },
  })
}

export function useFolderMutations() {
  const queryClient = useQueryClient()

  const invalidateFolders = async () => {
    await queryClient.invalidateQueries({ queryKey: folderQueryKey })
  }

  return {
    createFolder: useMutation({
      mutationFn: ({ name, parentId }: { name: string; parentId?: string | null }) =>
        api.createFolder({ name, parent_id: parentId }),
      onSuccess: invalidateFolders,
    }),
    deleteFolder: useMutation({
      mutationFn: (id: string) => api.deleteFolder(id),
      onSuccess: invalidateFolders,
    }),
    updateFolder: useMutation({
      mutationFn: ({ id, name, parentId }: { id: string; name: string; parentId?: string | null }) =>
        api.updateFolder(id, { name, parent_id: parentId }),
      onSuccess: invalidateFolders,
    }),
    moveFolder: useMutation({
      mutationFn: ({ id, parentId, sortOrder }: { id: string; parentId?: string | null; sortOrder: number }) =>
        api.moveFolder(id, { parent_id: parentId, sort_order: sortOrder }),
      onSuccess: invalidateFolders,
    }),
    reorderFolders: useMutation({
      mutationFn: (ids: string[]) => api.reorderFolders(ids),
      onSuccess: invalidateFolders,
    }),
  }
}

export type FlattenedFolder = {
  depth: number
  folder: Folder
  parentId: string | null
}

export function flattenFolderTree(folders: Folder[], depth = 0, parentId: string | null = null): FlattenedFolder[] {
  return folders.flatMap((folder) => [
    { folder, depth, parentId },
    ...flattenFolderTree(folder.children ?? [], depth + 1, folder.id),
  ])
}
