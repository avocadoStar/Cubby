import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import FormModal from './FormModal'

vi.mock('./ModalBase', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

describe('FormModal', () => {
  it('keeps cancel out of form submission while primary action submits', () => {
    const html = renderToStaticMarkup(
      <FormModal
        title="Edit"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        submitLabel="保存"
      >
        <input name="title" defaultValue="Example" />
      </FormModal>,
    )

    expect(html).toMatch(/type="button"[^>]*>取消<\/button>/)
    expect(html).toMatch(/type="submit"[^>]*>保存<\/button>/)
  })
})
