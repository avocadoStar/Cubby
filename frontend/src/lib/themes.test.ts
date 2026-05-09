import { describe, expect, it } from 'vitest'
import { themes } from './themes'

describe('themes', () => {
  it('does not include Sunny as an application theme', () => {
    const sunny = themes.find(theme => theme.id === 'sunny')

    expect(sunny).toBeUndefined()
  })
})
