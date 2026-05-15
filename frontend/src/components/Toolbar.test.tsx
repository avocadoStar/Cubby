import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ThemeMenu } from './Toolbar'

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
    title: '',
    url: '',
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
