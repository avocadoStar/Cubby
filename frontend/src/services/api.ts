import type { Folder, Bookmark, MoveRequest } from '../types'

const BASE = '/api'

function token(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const t = token()
  if (t) {
    headers['Authorization'] = `Bearer ${t}`
  }

  const res = await fetch(BASE + url, { ...options, headers: { ...headers, ...options?.headers } })

  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.reload()
  }
  if (res.status === 409) {
    throw new ConflictError()
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return res.json()
}

export class ConflictError extends Error {
  constructor() {
    super('conflict')
  }
}

export const api = {
  // Auth
  login: (password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  // Folders
  getFolders: (parentId?: string | null) =>
    request<Folder[]>(`/folders${parentId ? `?parent_id=${parentId}` : ''}`),

  createFolder: (name: string, parentId?: string | null) =>
    request<Folder>('/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parent_id: parentId }),
    }),

  updateFolder: (id: string, name: string, version: number) =>
    request<Folder>(`/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, version }),
    }),

  deleteFolder: (id: string) =>
    request<void>(`/folders/${id}`, { method: 'DELETE' }),

  moveFolder: (req: MoveRequest) =>
    request<Folder>('/folders/move', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  // Bookmarks
  getBookmarks: (folderId?: string | null) =>
    request<Bookmark[]>(`/bookmarks${folderId ? `?folder_id=${folderId}` : ''}`),

  createBookmark: (title: string, url: string, folderId?: string | null) =>
    request<Bookmark>('/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ title, url, folder_id: folderId }),
    }),

  updateBookmark: (id: string, title: string, url: string, version: number) =>
    request<Bookmark>(`/bookmarks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, url, version }),
    }),

  deleteBookmark: (id: string) =>
    request<void>(`/bookmarks/${id}`, { method: 'DELETE' }),

  restoreBookmark: (id: string) =>
    request<Bookmark>(`/bookmarks/${id}/restore`, { method: 'PUT' }),

  moveBookmark: (req: MoveRequest) =>
    request<Bookmark>('/bookmarks/move', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  batchDeleteBookmarks: (ids: string[]) =>
    request<void>('/bookmarks/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  batchDeleteFolders: (ids: string[]) =>
    request<void>('/folders/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Search
  search: (q: string) =>
    request<Bookmark[]>(`/search?q=${encodeURIComponent(q)}`),

  // Import
  fetchMetadata: (url: string) =>
    request<{ title: string }>(`/metadata?url=${encodeURIComponent(url)}`),

  importBookmarks: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const t = token()
    const headers: Record<string, string> = {}
    if (t) headers['Authorization'] = `Bearer ${t}`
    return fetch(BASE + '/import', { method: 'POST', body: form, headers })
  },
}
