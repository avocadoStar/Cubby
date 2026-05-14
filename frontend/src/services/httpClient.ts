import { ConflictError, readErrorMessage } from './apiErrors'

const BASE = '/api'

function token(): string | null {
  return localStorage.getItem('token')
}

export type RequestOptions = RequestInit & {
  signal?: AbortSignal
  skipAuthRedirect?: boolean
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const t = token()
  if (t) {
    headers['Authorization'] = `Bearer ${t}`
  }
  return headers
}

export async function request<T>(url: string, options?: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {}
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  Object.assign(headers, authHeaders())

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

export async function requestBlob(url: string, options?: RequestInit): Promise<Blob> {
  const res = await fetch(BASE + url, { ...options, headers: { ...authHeaders(), ...(options?.headers as Record<string, string>) } })
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.reload()
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  return res.blob()
}
