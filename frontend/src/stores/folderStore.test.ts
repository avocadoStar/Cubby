import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFolderStore } from './folderStore'
import { api } from '../services/api'
import type { Folder } from '../types'

vi.mock('../services/api', () => ({
  api: {
    getFolders: vi.fn(),
    createFolder: vi.fn(),
    updateFolder: vi.fn(),
    deleteFolder: vi.fn(),
    restoreFolder: vi.fn(),
    moveFolder: vi.fn(),
  },
  ConflictError: class extends Error {
    constructor(msg = 'conflict') { super(msg) }
  },
}))

vi.mock('../lib/sortKeys', () => ({
  computeSortKeyFromNeighbors: vi.fn(() => 'mid'),
}))

vi.mock('./toastStore', () => ({
  useToastStore: {
    getState: vi.fn(() => ({
      show: vi.fn(),
    })),
  },
}))

const makeFolder = (overrides: Partial<Folder> = {}): Folder => ({
  id: 'f1',
  name: 'Test Folder',
  parent_id: null,
  sort_key: 'n',
  version: 1,
  has_children: false,
  created_at: '',
  updated_at: '',
  ...overrides,
})

describe('folderStore', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useFolderStore.setState({
      folderMap: new Map(),
      childrenMap: new Map(),
      expandedIds: new Set(),
      selectedId: null,
      visibleNodes: [],
    })
  })

  describe('loadChildren', () => {
    it('loads folders and updates maps', async () => {
      const folders = [makeFolder({ id: 'f1', parent_id: null }), makeFolder({ id: 'f2', parent_id: null })]
      vi.mocked(api.getFolders).mockResolvedValue(folders)

      await useFolderStore.getState().loadChildren(null)

      expect(api.getFolders).toHaveBeenCalledWith(null)
      const state = useFolderStore.getState()
      expect(state.folderMap.get('f1')).toEqual(folders[0])
      expect(state.folderMap.get('f2')).toEqual(folders[1])
      expect(state.childrenMap.get(null)).toEqual(['f1', 'f2'])
    })

    it('updates parent has_children flag', async () => {
      const parent = makeFolder({ id: 'p1', has_children: false })
      useFolderStore.setState({ folderMap: new Map([['p1', parent]]) })

      const children = [makeFolder({ id: 'c1', parent_id: 'p1' })]
      vi.mocked(api.getFolders).mockResolvedValue(children)

      await useFolderStore.getState().loadChildren('p1')

      expect(useFolderStore.getState().folderMap.get('p1')?.has_children).toBe(true)
    })
  })

  describe('create', () => {
    it('adds the created folder locally and rebuilds visible nodes', async () => {
      const created = makeFolder({ id: 'f2', name: 'Created', parent_id: null, sort_key: 'a' })
      const existing = makeFolder({ id: 'f1', parent_id: null, sort_key: 'n' })
      vi.mocked(api.createFolder).mockResolvedValue(created)
      useFolderStore.setState({
        folderMap: new Map([['f1', existing]]),
        childrenMap: new Map([[null, ['f1']]]),
      })

      await useFolderStore.getState().create('Created', null)

      expect(api.createFolder).toHaveBeenCalledWith('Created', null)
      const state = useFolderStore.getState()
      expect(state.folderMap.get('f2')).toEqual(created)
      expect(state.childrenMap.get(null)).toEqual(['f2', 'f1'])
      expect(state.visibleNodes.map((item) => item.node.id)).toEqual(['f2', 'f1'])
    })
  })

  describe('rename', () => {
    it('updates the folder locally and rebuilds visible nodes', async () => {
      const original = makeFolder({ id: 'f1', name: 'Old' })
      const updated = makeFolder({ id: 'f1', name: 'New', version: 2 })
      vi.mocked(api.updateFolder).mockResolvedValue(updated)
      useFolderStore.setState({
        folderMap: new Map([['f1', original]]),
        childrenMap: new Map([[null, ['f1']]]),
      })

      await useFolderStore.getState().rename('f1', 'New', 1)

      expect(api.updateFolder).toHaveBeenCalledWith('f1', 'New', 1)
      expect(useFolderStore.getState().folderMap.get('f1')).toEqual(updated)
      expect(useFolderStore.getState().visibleNodes[0].node.name).toBe('New')
    })
  })

  describe('toggleExpand', () => {
    it('toggles expanded state for a folder', () => {
      useFolderStore.setState({
        folderMap: new Map([['f1', makeFolder({ id: 'f1' })]]),
        childrenMap: new Map([[null, ['f1']]]),
        expandedIds: new Set(),
      })

      useFolderStore.getState().toggleExpand('f1')
      expect(useFolderStore.getState().expandedIds.has('f1')).toBe(true)

      useFolderStore.getState().toggleExpand('f1')
      expect(useFolderStore.getState().expandedIds.has('f1')).toBe(false)
    })

    it('loads children when expanding an unloaded folder', () => {
      vi.mocked(api.getFolders).mockResolvedValue([])
      useFolderStore.setState({
        folderMap: new Map([['f1', makeFolder({ id: 'f1' })]]),
        childrenMap: new Map([[null, ['f1']]]),
        expandedIds: new Set(),
      })

      useFolderStore.getState().toggleExpand('f1')

      expect(api.getFolders).toHaveBeenCalledWith('f1')
    })
  })

  describe('select', () => {
    it('sets selectedId immediately before loading unloaded children', async () => {
      const target = makeFolder({ id: 't', parent_id: null })
      let resolveFolders!: (folders: Folder[]) => void
      vi.mocked(api.getFolders).mockReturnValue(new Promise((resolve) => {
        resolveFolders = resolve
      }))

      useFolderStore.setState({
        folderMap: new Map([['t', target]]),
        childrenMap: new Map([[null, ['t']]]),
      })

      const selection = useFolderStore.getState().select('t')

      expect(useFolderStore.getState().selectedId).toBe('t')
      expect(api.getFolders).toHaveBeenCalledWith('t')

      resolveFolders([])
      await selection
    })

    it('sets selectedId and expands ancestors', async () => {
      const grandparent = makeFolder({ id: 'gp', parent_id: null })
      const parent = makeFolder({ id: 'p', parent_id: 'gp' })
      const target = makeFolder({ id: 't', parent_id: 'p' })

      useFolderStore.setState({
        folderMap: new Map([['gp', grandparent], ['p', parent], ['t', target]]),
        childrenMap: new Map([[null, ['gp']], ['gp', ['p']], ['p', ['t']]]),
        expandedIds: new Set(),
      })
      vi.mocked(api.getFolders).mockResolvedValue([])

      await useFolderStore.getState().select('t')

      const state = useFolderStore.getState()
      expect(state.selectedId).toBe('t')
      expect(state.expandedIds.has('gp')).toBe(true)
      expect(state.expandedIds.has('p')).toBe(true)
    })

    it('sets selectedId to null when id is null', async () => {
      useFolderStore.setState({ selectedId: 'f1' })

      await useFolderStore.getState().select(null)

      expect(useFolderStore.getState().selectedId).toBeNull()
    })
  })

  describe('rebuildVisible', () => {
    it('builds visible nodes from tree structure', () => {
      const root = makeFolder({ id: 'r1', parent_id: null })
      const child = makeFolder({ id: 'c1', parent_id: 'r1' })

      useFolderStore.setState({
        folderMap: new Map([['r1', root], ['c1', child]]),
        childrenMap: new Map([[null, ['r1']], ['r1', ['c1']]]),
        expandedIds: new Set(['r1']),
      })

      useFolderStore.getState().rebuildVisible()

      const nodes = useFolderStore.getState().visibleNodes
      expect(nodes).toHaveLength(2)
      expect(nodes[0]).toEqual({ node: root, depth: 0 })
      expect(nodes[1]).toEqual({ node: child, depth: 1 })
    })

    it('hides collapsed children', () => {
      const root = makeFolder({ id: 'r1', parent_id: null })
      const child = makeFolder({ id: 'c1', parent_id: 'r1' })

      useFolderStore.setState({
        folderMap: new Map([['r1', root], ['c1', child]]),
        childrenMap: new Map([[null, ['r1']], ['r1', ['c1']]]),
        expandedIds: new Set(),
      })

      useFolderStore.getState().rebuildVisible()

      const nodes = useFolderStore.getState().visibleNodes
      expect(nodes).toHaveLength(1)
      expect(nodes[0].node.id).toBe('r1')
    })
  })
})
