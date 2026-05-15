import { describe, expect, it } from 'vitest'
import { useClickOutside } from './useClickOutside'

describe('useClickOutside', () => {
  it('is a function', () => {
    expect(typeof useClickOutside).toBe('function')
  })

  it('has correct parameter arity', () => {
    // ref, handler, optional delay
    expect(useClickOutside.length).toBeGreaterThanOrEqual(2)
  })
})
