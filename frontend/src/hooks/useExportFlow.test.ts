import { describe, expect, it, vi, beforeEach } from 'vitest'

const showMock = vi.hoisted(() => vi.fn())
const apiExportBookmarksMock = vi.hoisted(() => vi.fn())

vi.mock('../services/api', () => ({
  api: {
    exportBookmarks: apiExportBookmarksMock,
  },
}))

vi.mock('../stores/toastStore', () => ({
  useToastStore: {
    getState: () => ({ show: showMock }),
  },
}))

// Mock browser APIs used by exportBookmarks
const createElementSpy = vi.hoisted(() => vi.fn())
const createObjectURLSpy = vi.hoisted(() => vi.fn(() => 'blob:test'))
const revokeObjectURLSpy = vi.hoisted(() => vi.fn())

vi.stubGlobal('document', { createElement: createElementSpy })
vi.stubGlobal('URL', {
  createObjectURL: createObjectURLSpy,
  revokeObjectURL: revokeObjectURLSpy,
})

import { exportBookmarks } from './useExportFlow'

describe('exportBookmarks', () => {
  beforeEach(() => {
    showMock.mockClear()
    createElementSpy.mockClear()
    createObjectURLSpy.mockClear()
    revokeObjectURLSpy.mockClear()
  })

  it('downloads bookmarks and returns true on success', async () => {
    const blob = new Blob(['<html>bookmarks</html>'], { type: 'text/html' })
    apiExportBookmarksMock.mockResolvedValueOnce(blob)

    const mockAnchor = { href: '', download: '', click: vi.fn() }
    createElementSpy.mockReturnValueOnce(mockAnchor)

    const result = await exportBookmarks()

    expect(result).toBe(true)
    expect(apiExportBookmarksMock).toHaveBeenCalledOnce()
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob)
    expect(mockAnchor.click).toHaveBeenCalled()
    expect(mockAnchor.download).toBe('bookmarks.html')
  })

  it('shows toast and returns false when export fails', async () => {
    apiExportBookmarksMock.mockRejectedValueOnce(new Error('Network error'))

    const result = await exportBookmarks()

    expect(result).toBe(false)
    expect(showMock).toHaveBeenCalledWith({ message: 'Network error' })
  })
})
