import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import type { MoveRequest } from '../types'

const storage = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
})

describe('api move requests', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    storage.clear()
  })

  it('does not send client-generated sort_key for bookmark moves', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id: 'b1',
      title: 'Bookmark',
      url: 'https://example.com',
      icon: '',
      folder_id: null,
      sort_key: 'n',
      version: 2,
      notes: '',
      created_at: '',
      updated_at: '',
    })))

    await api.moveBookmark({
      id: 'b1',
      folder_id: null,
      prev_id: null,
      next_id: null,
      version: 1,
      sort_key: 'client-key',
    } as MoveRequest & { sort_key: string })

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
    expect(body.sort_key).toBeUndefined()
  })
})

describe('api export requests', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    storage.clear()
  })

  it('rejects failed export responses without reading a blob', async () => {
    const blob = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(JSON.stringify({ error: 'export failed' })),
      blob,
    } as unknown as Response)

    await expect(api.exportBookmarks()).rejects.toThrow('export failed')
    expect(blob).not.toHaveBeenCalled()
  })
})
