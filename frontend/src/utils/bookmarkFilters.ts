import type { Folder } from '../types'

export const pseudoFolderIds = ['recent', 'favorites', 'unsorted'] as const

export type PseudoFolderId = (typeof pseudoFolderIds)[number]
export type BookmarkSelection = string | null

export function isPseudoFolderId(value: string | null): value is PseudoFolderId {
  return value !== null && pseudoFolderIds.includes(value as PseudoFolderId)
}

export function buildBookmarkParams(selection: string | null, query = ''): Record<string, string> {
  const params: Record<string, string> = {}
  const trimmedQuery = query.trim()

  if (trimmedQuery) {
    params.q = trimmedQuery
  }

  if (selection === 'recent') {
    params.recent = 'true'
  } else if (selection === 'favorites') {
    params.favorite = 'true'
  } else if (selection === 'unsorted') {
    params.unsorted = 'true'
  } else if (selection) {
    params.folder_id = selection
  }

  return params
}

export function getActionableFolderId(selection: string | null): string | null {
  if (!selection || isPseudoFolderId(selection)) {
    return null
  }

  return selection
}

export function flattenFolders(folders: Folder[]): Array<{ id: string; name: string; depth: number }> {
  const items: Array<{ id: string; name: string; depth: number }> = []

  const visit = (folder: Folder, depth: number) => {
    items.push({ id: folder.id, name: folder.name, depth })
    folder.children?.forEach((child) => visit(child, depth + 1))
  }

  folders.forEach((folder) => visit(folder, 0))
  return items
}

export function findFolderName(folders: Folder[], folderId: string | null): string | null {
  if (!folderId) {
    return null
  }

  for (const folder of folders) {
    if (folder.id === folderId) {
      return folder.name
    }
    const childMatch = findFolderName(folder.children ?? [], folderId)
    if (childMatch) {
      return childMatch
    }
  }

  return null
}
