import axios from 'axios'
import type {
  AISuggestion,
  Bookmark,
  BookmarkListResult,
  BookmarkMutation,
  Folder,
  ImportResult,
  SettingsResponse,
} from '../types'

const api = axios.create({ baseURL: '/api/v1' })

export const getFolders = () => api.get<Folder[]>('/folders').then((response) => response.data)
export const createFolder = (data: { name: string; parent_id?: string | null }) =>
  api.post<Folder>('/folders', data).then((response) => response.data)
export const updateFolder = (id: string, data: { name: string; parent_id?: string | null }) =>
  api.put(`/folders/${id}`, data).then((response) => response.data)
export const deleteFolder = (id: string) => api.delete(`/folders/${id}`).then((response) => response.data)

export const getBookmarks = (params?: Record<string, string>) =>
  api.get<BookmarkListResult>('/bookmarks', { params }).then((response) => response.data)
export const createBookmark = (data: BookmarkMutation) =>
  api.post<Bookmark>('/bookmarks', data).then((response) => response.data)
export const updateBookmark = (id: string, data: Partial<BookmarkMutation>) =>
  api.put<Bookmark>(`/bookmarks/${id}`, data).then((response) => response.data)
export const deleteBookmark = (id: string) => api.delete(`/bookmarks/${id}`).then((response) => response.data)
export const toggleFavorite = (id: string) =>
  api.put(`/bookmarks/${id}/favorite`).then((response) => response.data)
export const importBookmarks = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<ImportResult>('/bookmarks/import', formData).then((response) => response.data)
}

export const aiOrganize = (folderId?: string, action: 'suggest' | 'apply' = 'suggest') =>
  api
    .post<{ suggestions: AISuggestion[] }>('/ai/organize', { folder_id: folderId || '', action })
    .then((response) => response.data)

export const fetchTitle = (url: string) =>
  api.post<{ title: string }>('/fetch-title', { url }).then((response) => response.data)
export const getSettings = () => api.get<SettingsResponse>('/settings').then((response) => response.data)
export const updateSettings = (data: Record<string, string>) =>
  api.put('/settings', data).then((response) => response.data)
export const testAIConnection = () =>
  api.post<{ ok: boolean; message: string }>('/settings/ai/test').then((response) => response.data)
