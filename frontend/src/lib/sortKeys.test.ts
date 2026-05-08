import { describe, expect, it } from 'vitest'
import { computeSortKeyFromNeighbors, sortAfter, sortBefore, sortBetween } from './sortKeys'

describe('sortKeys', () => {
  it('computes keys around neighbors without leaving the printable range', () => {
    expect(sortBefore('n') < 'n').toBe(true)
    expect(sortAfter('n') > 'n').toBe(true)

    const between = sortBetween('a', 'c')
    expect(between > 'a').toBe(true)
    expect(between < 'c').toBe(true)
  })

  it('returns an empty optimistic key when neighbors are invalid', () => {
    expect(computeSortKeyFromNeighbors('z', 'a')).toBe('')
  })
})
