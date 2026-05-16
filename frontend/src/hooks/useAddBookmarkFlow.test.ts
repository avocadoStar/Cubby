import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Bookmark } from '../types'
import { api } from '../services/api'
import { useAddBookmarkFlow } from './useAddBookmarkFlow'

const reactMocks = vi.hoisted(() => ({
  useEffect: vi.fn(),
  useRef: vi.fn(),
  useState: vi.fn(),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useEffect: reactMocks.useEffect,
    useRef: reactMocks.useRef,
    useState: reactMocks.useState,
  }
})

vi.mock('../services/api', () => ({
  api: {
    createBookmark: vi.fn(),
    fetchMetadata: vi.fn(),
  },
}))

const bookmark: Bookmark = {
  id: 'b1',
  title: 'Manual title',
  url: 'https://example.com',
  icon: 'icon-data',
  folder_id: 'f1',
  sort_key: 'n',
  version: 1,
  notes: 'Fetched description',
  created_at: '',
  updated_at: '',
}

function mockStateValues(values: unknown[]) {
  const setters: ReturnType<typeof vi.fn>[] = []
  let index = 0
  reactMocks.useState.mockImplementation((initial: unknown) => {
    const setter = vi.fn()
    setters.push(setter)
    const value = index < values.length ? values[index] : initial
    index += 1
    return [value, setter]
  })
  return setters
}

describe('useAddBookmarkFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reactMocks.useEffect.mockImplementation(() => undefined)
    reactMocks.useRef.mockReturnValue({ current: undefined })
    vi.mocked(api.createBookmark).mockResolvedValue(bookmark)
  })

  it('passes fetched description as notes when creating a bookmark', async () => {
    mockStateValues([
      'Manual title',
      'https://example.com',
      'icon-data',
      'Fetched description',
      '',
      '',
      '',
      false,
      false,
    ])

    const flow = useAddBookmarkFlow({
      selectedId: 'f1',
      upsertOne: vi.fn(),
    })

    await flow.submit()

    expect(api.createBookmark).toHaveBeenCalledWith(
      'Manual title',
      'https://example.com',
      'f1',
      'icon-data',
      'Fetched description',
    )
  })

  it('clears stale fetched description when the URL changes or the flow resets', () => {
    const setters = mockStateValues([
      '',
      'https://example.com',
      'icon-data',
      'Stale description',
      '',
      '',
      '',
      false,
      false,
    ])

    const flow = useAddBookmarkFlow({
      selectedId: null,
      upsertOne: vi.fn(),
    })

    flow.handleUrlChange('https://other.example')
    flow.reset(true)

    expect(setters[3]).toHaveBeenCalledWith('')
  })
})
