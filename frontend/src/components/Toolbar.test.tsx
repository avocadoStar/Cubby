import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Toolbar, { ThemeMenu } from './Toolbar'
import { useAddBookmarkFlow } from '../hooks/useAddBookmarkFlow'

const reactMocks = vi.hoisted(() => ({
  useState: vi.fn(),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: reactMocks.useState,
  }
})

vi.mock('../stores/folderStore', () => ({
  useFolderStore: vi.fn(() => ({ selectedId: null })),
}))

vi.mock('../stores/bookmarkStore', () => ({
  useBookmarkStore: vi.fn(() => ({ upsertOne: vi.fn() })),
}))

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => vi.fn()),
}))

vi.mock('../stores/themeStore', () => ({
  useThemeStore: vi.fn(() => ({ themeId: 'neumorphism', setTheme: vi.fn() })),
}))

vi.mock('../hooks/useAddBookmarkFlow', () => ({
  useAddBookmarkFlow: vi.fn(() => ({
    title: 'Example',
    url: 'https://example.com',
    titleError: '',
    urlError: '',
    duplicateUrlError: '',
    fetchingTitle: false,
    saving: false,
    handleTitleChange: vi.fn(),
    handleUrlChange: vi.fn(),
    submit: vi.fn(),
    reset: vi.fn(() => true),
  })),
}))

vi.mock('./Breadcrumb', () => ({
  default: () => <span>Breadcrumb</span>,
}))

vi.mock('./MoreMenu', () => ({
  default: () => <span>MoreMenu</span>,
}))

vi.mock('./CreateFolderModal', () => ({
  default: () => <span>CreateFolderModal</span>,
}))

vi.mock('./FontSizePopover', () => ({
  default: () => <span>FontSizePopover</span>,
}))

vi.mock('./ModalBase', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

beforeEach(() => {
  reactMocks.useState.mockImplementation(<T,>(initial: T) => [initial, vi.fn()])
  vi.mocked(useAddBookmarkFlow).mockReturnValue({
    title: 'Example',
    url: 'https://example.com',
    titleError: '',
    urlError: '',
    duplicateUrlError: '',
    fetchingTitle: false,
    saving: false,
    setTitle: vi.fn(),
    handleTitleChange: vi.fn(),
    handleUrlChange: vi.fn(),
    clearTransient: vi.fn(),
    reset: vi.fn(() => true),
    submit: vi.fn(),
  })
})

describe('ThemeMenu', () => {
  it('keeps the Neumorphism selection state without rendering a trailing check mark', () => {
    const html = renderToStaticMarkup(
      <ThemeMenu themeId="neumorphism" onSelectTheme={vi.fn()} />,
    )

    const neumorphismIndex = html.indexOf('Neumorphism')
    const selectedMarkerIndex = html.indexOf('data-theme-selected-marker="true"')
    const selectedMarkerCount = html.match(/data-theme-selected-marker="true"/g)?.length ?? 0
    const markerSlotCount = html.match(/data-theme-marker-slot="true"/g)?.length ?? 0

    expect(neumorphismIndex).toBeGreaterThanOrEqual(0)
    expect(selectedMarkerIndex).toBeGreaterThan(neumorphismIndex)
    expect(selectedMarkerCount).toBe(1)
    expect(markerSlotCount).toBe(2)
    expect(html).toContain('aria-current="true"')
    expect(html).not.toContain('\u2713')
  })
})

describe('Toolbar add bookmark modal', () => {
  it('keeps the cancel button out of form submission when Enter submits the form', () => {
    reactMocks.useState
      .mockImplementationOnce(<T,>(initial: T) => [initial, vi.fn()])
      .mockImplementationOnce(<T,>(initial: T) => [initial, vi.fn()])
      .mockImplementationOnce(<T,>(initial: T) => [initial, vi.fn()])
      .mockImplementationOnce(() => [true, vi.fn()])

    const html = renderToStaticMarkup(<Toolbar />)

    expect(html).toMatch(/type="button"[^>]*>取消<\/button>/)
    expect(html).toMatch(/type="submit"[^>]*>添加<\/button>/)
  })
})
