import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import SidePanelFrame from './SidePanelFrame'

describe('SidePanelFrame', () => {
  it('disables width transition while resizing', () => {
    const html = renderToStaticMarkup(
      <SidePanelFrame open width={640} resizing onClose={() => {}}>
        <div>content</div>
      </SidePanelFrame>,
    )

    expect(html).not.toContain('width 0.2s')
    expect(html).toContain('border-color 0.2s')
  })
})
