import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import MobileSearch from './MobileSearch'

vi.mock('../../stores/searchStore', () => ({
  useSearchStore: () => ({
    query: '',
    search: vi.fn(),
  }),
}))

describe('MobileSearch', () => {
  it('uses readable labels and tokenized input/button radius', () => {
    const html = renderToStaticMarkup(<MobileSearch onOpenFilters={vi.fn()} />)

    expect(html).toContain('placeholder="搜索书签"')
    expect(html).toContain('筛选')
    expect(html).toContain('rounded-input')
    expect(html).toContain('rounded-button')
  })
})
