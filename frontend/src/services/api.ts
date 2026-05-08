import type { Folder, Bookmark, SearchResultItem, MoveRequest, BatchMoveItem, BatchMoveResponse } from '../types'

const BASE = '/api'

function token(): string | null {
  return localStorage.getItem('token')
}

type RequestOptions = RequestInit & {
  signal?: AbortSignal
  skipAuthRedirect?: boolean
}

async function request<T>(url: string, options?: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {}
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const t = token()
  if (t) {
    headers['Authorization'] = `Bearer ${t}`
  }

  const { signal, skipAuthRedirect = false, ...rest } = options ?? {}
  const res = await fetch(BASE + url, { ...rest, headers: { ...headers, ...(options?.headers as Record<string, string>) }, signal })

  if (res.status === 401) {
    if (skipAuthRedirect) {
      const text = await res.text()
      throw new Error(text || 'Unauthorized')
    }
    localStorage.removeItem('token')
    window.location.reload()
    throw new Error('Unauthorized')
  }
  if (res.status === 409) {
    throw new ConflictError(await readErrorMessage(res))
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
  constructor(message = 'conflict') {
    super(message)
  }
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text()
  if (!text) return 'conflict'
  try {
    const data = JSON.parse(text) as { error?: unknown }
    if (typeof data.error === 'string' && data.error) return data.error
  } catch {
    // Fall through to the raw response body.
  }
  return text
}

export const api = {
  // Auth
  login: (password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
      skipAuthRedirect: true,
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

  restoreFolder: (id: string) =>
    request<Folder>(`/folders/${id}/restore`, { method: 'PUT' }),

  moveFolder: (req: MoveRequest) =>
    request<Folder>('/folders/move', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  // Bookmarks
  getBookmarks: (folderId?: string | null, signal?: AbortSignal) =>
    request<Bookmark[]>(`/bookmarks${folderId ? `?folder_id=${folderId}` : ''}`, { signal }),

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

  updateNotes: (id: string, notes: string) =>
    request<void>(`/bookmarks/${id}/notes`, { method: 'PATCH', body: JSON.stringify({ notes }) }),

  moveBookmark: (req: MoveRequest) =>
    request<Bookmark>('/bookmarks/move', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  batchMove: (items: BatchMoveItem[]) =>
    request<BatchMoveResponse>('/moves/batch', {
      method: 'POST',
      body: JSON.stringify({
        items: items.map(({ kind, id, parent_id, prev_id, next_id, version }) => ({
          kind,
          id,
          parent_id,
          prev_id: prev_id ?? null,
          next_id: next_id ?? null,
          version,
        })),
      }),
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
  search: (q: string, signal?: AbortSignal) =>
    request<SearchResultItem[]>(`/search?q=${encodeURIComponent(q)}`, { signal }),

  // Import
  fetchMetadata: (url: string) =>
    request<{ title: string }>(`/metadata?url=${encodeURIComponent(url)}`),

  importBookmarks: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ bookmarks: number; folders: number }>('/import', { method: 'POST', body: form })
  },
}
