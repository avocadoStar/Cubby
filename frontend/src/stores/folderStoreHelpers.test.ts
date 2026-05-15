import { describe, expect, it } from 'vitest'
import type { Folder } from '../types'
import {
  addCreatedFolderToMaps,
  applyOptimisticFolderMoveToMaps,
  removeFolderFromMaps,
  setFolderInMap,
  sortFolderIdsBySortKey,
} from './folderStoreHelpers'

const folder = (overrides: Partial<Folder>): Folder => ({
  id: 'folder',
  name: 'Folder',
  parent_id: null,
  sort_key: 'n',
  version: 1,
  has_children: false,
  created_at: '',
  updated_at: '',
  ...overrides,
})

describe('folder store helpers', () => {
  it('sorts folder ids by sort key with id tie-breaker', () => {
    const folderMap = new Map([
      ['b', folder({ id: 'b', sort_key: 'n' })],
      ['a', folder({ id: 'a', sort_key: 'n' })],
      ['c', folder({ id: 'c', sort_key: 'a' })],
    ])

    expect(sortFolderIdsBySortKey(['b', 'a', 'c'], folderMap)).toEqual(['c', 'a', 'b'])
  })

  it('adds created folders and marks the parent as non-empty', () => {
    const parent = folder({ id: 'parent', has_children: false })
    const created = folder({ id: 'child', parent_id: 'parent', sort_key: 'a' })

    const result = addCreatedFolderToMaps(
      new Map([['parent', parent]]),
      new Map([['parent', []]]),
      created,
      'parent',
    )

    expect(result.folderMap.get('child')).toEqual(created)
    expect(result.folderMap.get('parent')?.has_children).toBe(true)
    expect(result.childrenMap.get('parent')).toEqual(['child'])
  })

  it('removes a folder from all children maps', () => {
    const result = removeFolderFromMaps(
      new Map([['child', folder({ id: 'child' })]]),
      new Map([[null, ['child']], ['parent', ['child']]]),
      'child',
    )

    expect(result.folderMap.has('child')).toBe(false)
    expect(result.childrenMap.get(null)).toEqual([])
    expect(result.childrenMap.get('parent')).toEqual([])
  })

  it('sets a folder in a cloned map', () => {
    const source = new Map([['folder', folder({ id: 'folder', name: 'Old' })]])
    const next = setFolderInMap(source, folder({ id: 'folder', name: 'New' }))

    expect(next.get('folder')?.name).toBe('New')
    expect(source.get('folder')?.name).toBe('Old')
  })

  it('applies an optimistic folder move and updates parent child flags', () => {
    const oldParent = folder({ id: 'old-parent', has_children: true })
    const newParent = folder({ id: 'new-parent', has_children: false })
    const moving = folder({ id: 'moving', parent_id: 'old-parent', sort_key: 'm' })
    const result = applyOptimisticFolderMoveToMaps(
      new Map([
        ['old-parent', oldParent],
        ['new-parent', newParent],
        ['moving', moving],
      ]),
      new Map([[null, ['old-parent', 'new-parent']], ['old-parent', ['moving']], ['new-parent', []]]),
      moving,
      'new-parent',
      null,
      null,
      'z',
      2,
    )

    expect(result.folderMap.get('moving')).toMatchObject({ parent_id: 'new-parent', sort_key: 'z', version: 2 })
    expect(result.folderMap.get('old-parent')?.has_children).toBe(false)
    expect(result.folderMap.get('new-parent')?.has_children).toBe(true)
    expect(result.childrenMap.get('old-parent')).toEqual([])
    expect(result.childrenMap.get('new-parent')).toEqual(['moving'])
  })
})
