import { describe, expect, it } from 'vitest'
import { buildBreadcrumbPath } from '../lib/breadcrumb'
import type { Folder } from '../types'

const makeFolder = (overrides: Partial<Folder> = {}): Folder => ({
  id: 'f1',
  name: 'Folder',
  parent_id: null,
  sort_key: 'n',
  version: 1,
  has_children: false,
  created_at: '',
  updated_at: '',
  ...overrides,
})

function namesForPath(path: { name: string }[]): string {
  return path.map(item => item.name).join('/')
}

describe('Breadcrumb', () => {
  it('renders only the root label when no folder is selected', () => {
    const path = buildBreadcrumbPath(null, new Map())

    expect(namesForPath(path)).toBe('收藏夹')
  })

  it('renders the root before a top-level selected folder', () => {
    const path = buildBreadcrumbPath(
      'allrouter',
      new Map([
        ['allrouter', makeFolder({ id: 'allrouter', name: 'AllRouter' })],
      ]),
    )

    expect(namesForPath(path)).toBe('收藏夹/AllRouter')
  })

  it('renders nested folders from root to current folder', () => {
    const path = buildBreadcrumbPath(
      'bsc',
      new Map([
        ['allrouter', makeFolder({ id: 'allrouter', name: 'AllRouter' })],
        ['crypto', makeFolder({ id: 'crypto', name: 'crypto', parent_id: 'allrouter' })],
        ['bsc', makeFolder({ id: 'bsc', name: 'BSC', parent_id: 'crypto' })],
      ]),
    )

    expect(namesForPath(path)).toBe('收藏夹/AllRouter/crypto/BSC')
  })
})
