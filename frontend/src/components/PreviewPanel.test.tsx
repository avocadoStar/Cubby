import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PreviewPanel from './PreviewPanel'
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
  it('renders the iframe preview without the Cubby fallback warning', () => {
    const html = renderToStaticMarkup(
      <PreviewPanel bookmark={bookmark} onClose={() => {}} />,
    )

    expect(html).toContain('src="https://example.com"')
    expect(html).not.toContain('该网站可能不允许嵌入预览')
  })
})
