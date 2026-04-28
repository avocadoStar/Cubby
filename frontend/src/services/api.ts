import axios from 'axios'
import type { Folder, Bookmark, BookmarkListResult, AISuggestion } from '../types'

const api = axios.create({ baseURL: '/api/v1' })

export const getFolders = () => api.get<Folder[]>('/folders').then(r => r.data)
export const createFolder = (data: { name: string; parent_id?: string | null }) =>
  api.post<Folder>('/folders', data).then(r => r.data)
export const updateFolder = (id: string, data: { name: string; parent_id?: string | null }) =>
  api.put(`/folders/${id}`, data).then(r => r.data)
export const deleteFolder = (id: string) => api.delete(`/folders/${id}`).then(r => r.data)
export const reorderFolders = (ids: string[]) => api.put('/folders/reorder', { ids }).then(r => r.data)

export const getBookmarks = (params?: Record<string, string>) =>
  api.get<BookmarkListResult>('/bookmarks', { params }).then(r => r.data)
export const getBookmark = (id: string) => api.get<Bookmark>(`/bookmarks/${id}`).then(r => r.data)
export const createBookmark = (data: Partial<Bookmark>) =>
  api.post<Bookmark>('/bookmarks', data).then(r => r.data)
export const updateBookmark = (id: string, data: Partial<Bookmark>) =>
  api.put<Bookmark>(`/bookmarks/${id}`, data).then(r => r.data)
export const deleteBookmark = (id: string) => api.delete(`/bookmarks/${id}`).then(r => r.data)
export const toggleFavorite = (id: string) => api.put(`/bookmarks/${id}/favorite`).then(r => r.data)
export const reorderBookmarks = (ids: string[]) => api.put('/bookmarks/reorder', { ids }).then(r => r.data)
export const moveBookmark = (id: string, folder_id: string | null) =>
  api.put(`/bookmarks/${id}/folder`, { folder_id }).then(r => r.data)
export const importBookmarks = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/bookmarks/import', fd).then(r => r.data)
}
export const fetchMetadata = (id: string) => api.post(`/bookmarks/${id}/fetch-metadata`).then(r => r.data)

export const aiOrganize = (folderId?: string, action: 'suggest' | 'apply' = 'suggest') =>
  api.post<{ suggestions: AISuggestion[] }>('/ai/organize', { folder_id: folderId || '', action }).then(r => r.data)

export const getSettings = () => api.get<Record<string, string>>('/settings').then(r => r.data)
export const updateSettings = (data: Record<string, string>) => api.put('/settings', data).then(r => r.data)
export const testAIConnection = () => api.post('/settings/ai/test').then(r => r.data)
