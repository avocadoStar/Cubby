import axios from 'axios'
import type {
  AIPlan,
  AIPlanResponse,
  AuthStatusResponse,
  Bookmark,
  BookmarkListResult,
  BookmarkMutation,
  Folder,
  ImportTaskSnapshot,
  SettingsResponse,
} from '../types'

const api = axios.create({ baseURL: '/api/v1' })
let unauthorizedHandler: (() => void) | null = null

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  },
)

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler
}

export const getAuthStatus = () => api.get<AuthStatusResponse>('/auth/status').then((response) => response.data)
export const login = (password: string) =>
  api.post<AuthStatusResponse>('/auth/login', { password }).then((response) => response.data)
export const logout = () => api.post<{ ok: boolean }>('/auth/logout').then((response) => response.data)

export const getFolders = () => api.get<Folder[]>('/folders').then((response) => response.data)
export const createFolder = (data: { name: string; parent_id?: string | null }) =>
  api.post<Folder>('/folders', data).then((response) => response.data)
export const updateFolder = (id: string, data: { name: string; parent_id?: string | null }) =>
  api.put(`/folders/${id}`, data).then((response) => response.data)
export const deleteFolder = (id: string) => api.delete(`/folders/${id}`).then((response) => response.data)
export const moveFolder = (id: string, data: { parent_id?: string | null; sort_order: number }) =>
  api.put(`/folders/${id}/move`, data).then((response) => response.data)
export const reorderFolders = (ids: string[]) =>
  api.put('/folders/reorder', { ids }).then((response) => response.data)

export const getBookmarks = (params?: Record<string, string>) =>
  api.get<BookmarkListResult>('/bookmarks', { params }).then((response) => response.data)
export const createBookmark = (data: BookmarkMutation) =>
  api.post<Bookmark>('/bookmarks', data).then((response) => response.data)
export const updateBookmark = (id: string, data: Partial<BookmarkMutation>) =>
  api.put<Bookmark>(`/bookmarks/${id}`, data).then((response) => response.data)
export const deleteBookmark = (id: string) => api.delete(`/bookmarks/${id}`).then((response) => response.data)
export const toggleFavorite = (id: string) =>
  api.put(`/bookmarks/${id}/favorite`).then((response) => response.data)
export const reorderBookmarks = (ids: string[]) =>
  api.put('/bookmarks/reorder', { ids }).then((response) => response.data)
export const moveBookmark = (id: string, data: { folder_id?: string | null }) =>
  api.put(`/bookmarks/${id}/folder`, data).then((response) => response.data)
export const batchDeleteBookmarks = (ids: string[]) =>
  api.post('/bookmarks/batch/delete', { ids }).then((response) => response.data)
export const batchMoveBookmarks = (ids: string[], folderId?: string | null) =>
  api.post('/bookmarks/batch/move', { ids, folder_id: folderId ?? null }).then((response) => response.data)
export const batchFavoriteBookmarks = (ids: string[], isFavorite: boolean) =>
  api.post('/bookmarks/batch/favorite', { ids, is_favorite: isFavorite }).then((response) => response.data)
export const startImportBookmarks = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<ImportTaskSnapshot>('/bookmarks/import', formData).then((response) => response.data)
}

export const subscribeImportProgress = (
  taskId: string,
  handlers: {
    onError?: () => void
    onMessage: (snapshot: ImportTaskSnapshot) => void
  },
) => {
  const source = new EventSource(`/api/v1/bookmarks/import/${encodeURIComponent(taskId)}/events`)

  source.onmessage = (event) => {
    try {
      const snapshot = JSON.parse(event.data) as ImportTaskSnapshot
      handlers.onMessage(snapshot)
    } catch {
      handlers.onError?.()
    }
  }

  source.onerror = () => {
    handlers.onError?.()
  }

  return source
}

export const aiPlanOrganize = (folderId?: string, sessionId?: string) =>
  api
    .post<AIPlanResponse>('/ai/organize', {
      action: 'plan',
      folder_id: folderId || '',
      session_id: sessionId || '',
    })
    .then((response) => response.data)

export const aiApplyPlan = (plan: AIPlan, folderId?: string, sessionId?: string) =>
  api
    .post<AIPlanResponse>('/ai/organize', {
      action: 'apply',
      folder_id: folderId || '',
      plan,
      session_id: sessionId || '',
    })
    .then((response) => response.data)

export const aiUndoPlan = (undoToken: string, sessionId?: string) =>
  api
    .post<{ ok: boolean }>('/ai/organize', {
      action: 'undo',
      session_id: sessionId || '',
      undo_token: undoToken,
    })
    .then((response) => response.data)

export const aiCloseSession = (sessionId: string) =>
  api
    .post<{ ok: boolean }>('/ai/organize', {
      action: 'close',
      session_id: sessionId,
    })
    .then((response) => response.data)

export const fetchTitle = (url: string) =>
  api.post<{ title: string }>('/fetch-title', { url }).then((response) => response.data)
export const fetchMetadataPreview = (url: string, signal?: AbortSignal) =>
  api
    .post<{ description: string; title: string; url: string }>('/metadata-preview', { url }, { signal })
    .then((response) => response.data)
export const getSettings = () => api.get<SettingsResponse>('/settings').then((response) => response.data)
export const updateSettings = (data: Record<string, string>) =>
  api.put('/settings', data).then((response) => response.data)
export const testAIConnection = () =>
  api.post<{ ok: boolean; message: string }>('/settings/ai/test').then((response) => response.data)
