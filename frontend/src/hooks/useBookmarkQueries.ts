import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../services/api'
import type { BookmarkMutation } from '../types'
import { buildBookmarkParams } from '../utils/bookmarkFilters'

type BookmarkQueryInput = {
  query: string
  selection: string | null
}

export function bookmarkListQueryKey(input: BookmarkQueryInput) {
  return ['bookmarks', input.selection ?? 'all', input.query, 'all-results'] as const
}

export function useBookmarksQuery(input: BookmarkQueryInput) {
  const params = buildBookmarkParams(input.selection, input.query)

  return useQuery({
    queryKey: bookmarkListQueryKey(input),
    queryFn: async () =>
      api.getBookmarks({
        ...params,
        all: 'true',
      }),
  })
}

export function useBookmarkMutations(input: BookmarkQueryInput) {
  const queryClient = useQueryClient()
  const invalidateBookmarks = async () => {
    await queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    await queryClient.invalidateQueries({ queryKey: bookmarkListQueryKey(input) })
  }

  return {
    createBookmark: useMutation({
      mutationFn: (data: BookmarkMutation) => api.createBookmark(data),
      onSuccess: invalidateBookmarks,
    }),
    updateBookmark: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<BookmarkMutation> }) => api.updateBookmark(id, data),
      onSuccess: invalidateBookmarks,
    }),
    deleteBookmark: useMutation({
      mutationFn: (id: string) => api.deleteBookmark(id),
      onSuccess: invalidateBookmarks,
    }),
    toggleFavorite: useMutation({
      mutationFn: (id: string) => api.toggleFavorite(id),
      onSuccess: invalidateBookmarks,
    }),
    reorderBookmarks: useMutation({
      mutationFn: (ids: string[]) => api.reorderBookmarks(ids),
      onSuccess: invalidateBookmarks,
    }),
    moveBookmark: useMutation({
      mutationFn: ({ id, folderId }: { id: string; folderId?: string | null }) => api.moveBookmark(id, { folder_id: folderId }),
      onSuccess: invalidateBookmarks,
    }),
    batchDeleteBookmarks: useMutation({
      mutationFn: (ids: string[]) => api.batchDeleteBookmarks(ids),
      onSuccess: invalidateBookmarks,
    }),
    batchMoveBookmarks: useMutation({
      mutationFn: ({ ids, folderId }: { ids: string[]; folderId?: string | null }) => api.batchMoveBookmarks(ids, folderId),
      onSuccess: invalidateBookmarks,
    }),
    batchFavoriteBookmarks: useMutation({
      mutationFn: ({ ids, isFavorite }: { ids: string[]; isFavorite: boolean }) =>
        api.batchFavoriteBookmarks(ids, isFavorite),
      onSuccess: invalidateBookmarks,
    }),
    importBookmarks: useMutation({
      mutationFn: (file: File) => api.startImportBookmarks(file),
    }),
  }
}
