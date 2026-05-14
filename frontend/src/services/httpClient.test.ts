import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConflictError } from './apiErrors'
import { request } from './httpClient'

const storage = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  configurable: true,
})

describe('request', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    storage.clear()
  })

  it('clears auth and reloads on unauthorized responses by default', async () => {
    storage.set('token', 'jwt')
    const reload = vi.fn()
    vi.stubGlobal('window', { location: { reload } })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Unauthorized', { status: 401 }))

    await expect(request('/folders')).rejects.toThrow('Unauthorized')

    expect(storage.get('token')).toBeUndefined()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('preserves auth and skips reload when unauthorized redirect is disabled', async () => {
    storage.set('token', 'jwt')
    const reload = vi.fn()
    vi.stubGlobal('window', { location: { reload } })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('bad password', { status: 401 }))

    await expect(request('/auth/login', { skipAuthRedirect: true })).rejects.toThrow('bad password')

    expect(storage.get('token')).toBe('jwt')
    expect(reload).not.toHaveBeenCalled()
  })

  it('raises ConflictError with the server error message for conflicts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'already exists' }), { status: 409 }))

    await request('/bookmarks').catch((error) => {
      expect(error).toBeInstanceOf(ConflictError)
      expect(error).toHaveProperty('message', 'already exists')
    })
  })

  it('throws raw text for non-JSON failed responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('plain failure', { status: 500 }))

    await expect(request('/folders')).rejects.toThrow('plain failure')
  })

  it('returns undefined for no-content responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    await expect(request('/folders/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('does not set JSON content type for FormData bodies', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true })))
    const form = new FormData()
    form.append('file', new Blob(['body']), 'bookmarks.html')

    await request('/import', { method: 'POST', body: form })

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(init.headers).not.toMatchObject({ 'Content-Type': 'application/json' })
  })
})
