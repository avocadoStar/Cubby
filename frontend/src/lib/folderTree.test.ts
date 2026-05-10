import { describe, expect, it } from 'vitest'
import { buildVisibleNodes, getAncestorChain, rebuildChildrenMapAfterMove } from './folderTree'
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

describe('buildVisibleNodes', () => {
  it('returns empty for empty maps', () => {
    expect(buildVisibleNodes(new Map(), new Map(), new Set())).toEqual([])
  })

  it('builds flat tree when nothing expanded', () => {
    const f1 = makeFolder({ id: 'f1', parent_id: null })
    const f2 = makeFolder({ id: 'f2', parent_id: null })
    const folderMap = new Map([['f1', f1], ['f2', f2]])
    const childrenMap = new Map<string | null, string[]>([[null, ['f1', 'f2']]])

    const nodes = buildVisibleNodes(folderMap, childrenMap, new Set())
    expect(nodes).toEqual([
      { node: f1, depth: 0 },
      { node: f2, depth: 0 },
    ])
  })

  it('includes children of expanded nodes', () => {
    const f1 = makeFolder({ id: 'f1', parent_id: null })
    const f2 = makeFolder({ id: 'f2', parent_id: 'f1' })
    const folderMap = new Map([['f1', f1], ['f2', f2]])
    const childrenMap = new Map<string | null, string[]>([
      [null, ['f1']],
      ['f1', ['f2']],
    ])

    const nodes = buildVisibleNodes(folderMap, childrenMap, new Set(['f1']))
    expect(nodes).toEqual([
      { node: f1, depth: 0 },
      { node: f2, depth: 1 },
    ])
  })
})

describe('getAncestorChain', () => {
  it('returns empty for root folder', () => {
    const folderMap = new Map([['f1', makeFolder({ id: 'f1', parent_id: null })]])
    expect(getAncestorChain(folderMap, 'f1')).toEqual([])
  })

  it('returns ancestor chain for nested folder', () => {
    const folderMap = new Map([
      ['f1', makeFolder({ id: 'f1', parent_id: null })],
      ['f2', makeFolder({ id: 'f2', parent_id: 'f1' })],
      ['f3', makeFolder({ id: 'f3', parent_id: 'f2' })],
    ])
    expect(getAncestorChain(folderMap, 'f3')).toEqual(['f2', 'f1'])
  })
})

describe('rebuildChildrenMapAfterMove', () => {
  it('removes from old parent and inserts after prevId', () => {
    const childrenMap = new Map<string | null, string[]>([
      [null, ['f1', 'f2', 'f3']],
    ])

    const result = rebuildChildrenMapAfterMove(childrenMap, 'f3', null, null, 'f1', null)
    expect(result.get(null)).toEqual(['f1', 'f3', 'f2'])
  })

  it('moves between parents', () => {
    const childrenMap = new Map<string | null, string[]>([
      [null, ['f1', 'f2']],
      ['f1', ['f3']],
    ])

    const result = rebuildChildrenMapAfterMove(childrenMap, 'f2', null, 'f1', 'f3', null)
    expect(result.get(null)).toEqual(['f1'])
    expect(result.get('f1')).toEqual(['f3', 'f2'])
  })
})
