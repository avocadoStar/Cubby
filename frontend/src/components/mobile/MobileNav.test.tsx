import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { MobileAddModal } from './MobileNav'

vi.mock('../../stores/authStore', () => ({
  useAuthStore: Object.assign(vi.fn(() => vi.fn()), {
    getState: vi.fn(),
  }),
}))

const noop = vi.fn()

describe('MobileAddModal', () => {
  it('renders bookmark fields behind a segmented add layout', () => {
    const html = renderToStaticMarkup(
      <MobileAddModal
        mode="bookmark"
        title=""
        url=""
        folderName=""
        fetchingTitle={false}
        saving={false}
        duplicateUrlError=""
        onModeChange={noop}
        onTitleChange={noop}
        onUrlChange={noop}
        onFolderNameChange={noop}
        onClose={noop}
        onSubmitBookmark={noop}
        onSubmitFolder={noop}
      />,
    )

    expect(html).toContain('添加')
    expect(html).toMatch(/aria-pressed="true"[^>]*>书签/)
    expect(html).toMatch(/aria-pressed="false"[^>]*>文件夹/)
    expect(html).toContain('placeholder="名称"')
    expect(html).toContain('placeholder="URL"')
    expect(html).not.toContain('placeholder="文件夹名称"')
    expect(html).toContain('rounded-input')
  })

  it('renders folder creation as an equal tab without bookmark url fields', () => {
    const html = renderToStaticMarkup(
      <MobileAddModal
        mode="folder"
        title=""
        url=""
        folderName=""
        fetchingTitle={false}
        saving={false}
        duplicateUrlError=""
        onModeChange={noop}
        onTitleChange={noop}
        onUrlChange={noop}
        onFolderNameChange={noop}
        onClose={noop}
        onSubmitBookmark={noop}
        onSubmitFolder={noop}
      />,
    )

    expect(html).toMatch(/aria-pressed="false"[^>]*>书签/)
    expect(html).toMatch(/aria-pressed="true"[^>]*>文件夹/)
    expect(html).toContain('placeholder="文件夹名称"')
    expect(html).not.toContain('placeholder="URL"')
  })

  it('renders duplicate URL feedback in bookmark mode', () => {
    const html = renderToStaticMarkup(
      <MobileAddModal
        mode="bookmark"
        title="Example"
        url="https://example.com"
        folderName=""
        fetchingTitle={false}
        saving={false}
        duplicateUrlError="已存在"
        onModeChange={noop}
        onTitleChange={noop}
        onUrlChange={noop}
        onFolderNameChange={noop}
        onClose={noop}
        onSubmitBookmark={noop}
        onSubmitFolder={noop}
      />,
    )

    expect(html).toContain('已存在')
  })

  it('disables controls while saving so the modal cannot submit twice', () => {
    const html = renderToStaticMarkup(
      <MobileAddModal
        mode="bookmark"
        title="Example"
        url="https://example.com"
        folderName=""
        fetchingTitle={false}
        saving={true}
        duplicateUrlError=""
        onModeChange={noop}
        onTitleChange={noop}
        onUrlChange={noop}
        onFolderNameChange={noop}
        onClose={noop}
        onSubmitBookmark={noop}
        onSubmitFolder={noop}
      />,
    )

    expect(html).toMatch(/<input[^>]+disabled=""/)
    expect(html).toMatch(/<button type="submit"[^>]+disabled=""/)
  })
})
