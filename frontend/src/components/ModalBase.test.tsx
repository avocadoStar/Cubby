import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/motion', () => ({
  motionDurationMs: { exit: 150, fast: 100, normal: 200 },
  motionTransform: { modal: { open: 'scale(1)', closed: 'scale(0.95)' } },
  transitionFor: () => 'all 0.2s ease',
}))

import ModalBase from './ModalBase'

describe('ModalBase', () => {
  it('renders dialog role and aria-modal', () => {
    const html = renderToStaticMarkup(
      <ModalBase title="测试标题" onClose={() => {}}>
        <span>内容</span>
      </ModalBase>,
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-label="测试标题"')
  })

  it('renders the title in an h3', () => {
    const html = renderToStaticMarkup(
      <ModalBase title="我的弹窗" onClose={() => {}}>
        <input />
      </ModalBase>,
    )
    expect(html).toContain('<h3')
    expect(html).toContain('我的弹窗')
  })

  it('renders children inside the card', () => {
    const html = renderToStaticMarkup(
      <ModalBase title="T" onClose={() => {}}>
        <button>submit</button>
      </ModalBase>,
    )
    expect(html).toContain('<button>submit</button>')
  })

  it('uses default width when not specified', () => {
    const html = renderToStaticMarkup(
      <ModalBase title="T" onClose={() => {}}>
        <span />
      </ModalBase>,
    )
    expect(html).toContain('min(92vw, 360px)')
  })

  it('uses custom width when specified', () => {
    const html = renderToStaticMarkup(
      <ModalBase title="T" onClose={() => {}} width="500px">
        <span />
      </ModalBase>,
    )
    expect(html).toContain('min(92vw, 500px)')
  })
})
