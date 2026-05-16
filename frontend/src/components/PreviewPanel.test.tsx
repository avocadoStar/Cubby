import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PreviewPanel from './PreviewPanel'
import { calculatePreviewPanelWidth, compatibleMobilePreviewSandbox } from './previewPanelResize'
import type { Bookmark } from '../types'

const bookmark: Bookmark = {
  id: 'b1',
  title: 'Example',
  url: 'https://example.com',
  icon: '',
  folder_id: null,
  sort_key: 'n',
  version: 1,
  notes: '',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('PreviewPanel', () => {
  it('renders mobile preview controls by default', () => {
    const html = renderToStaticMarkup(
      <PreviewPanel bookmark={bookmark} onClose={() => {}} />,
    )

    expect(html).toContain('Mobile view')
    expect(html).toContain('Desktop view')
    expect(html).toContain('Open preview in new tab')
    expect(html).not.toContain('site may not allow embedded previews')
  })

  it('uses the compatible mobile preview sandbox', () => {
    expect(compatibleMobilePreviewSandbox).toBe('allow-scripts allow-same-origin allow-forms allow-popups')
  })

  it('calculates resize width from left-edge drag direction', () => {
    expect(calculatePreviewPanelWidth({ startWidth: 640, startX: 800, currentX: 700 })).toBe(740)
    expect(calculatePreviewPanelWidth({ startWidth: 640, startX: 800, currentX: 900 })).toBe(540)
    expect(calculatePreviewPanelWidth({ startWidth: 640, startX: 800, currentX: 1200 })).toBe(480)
    expect(calculatePreviewPanelWidth({ startWidth: 640, startX: 800, currentX: 200 })).toBe(1100)
  })
})
