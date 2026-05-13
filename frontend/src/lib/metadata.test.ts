import { describe, expect, it } from 'vitest'
import { shouldFetchMetadata } from './metadata'

describe('shouldFetchMetadata', () => {
  it('rejects localhost and local development ports', () => {
    expect(shouldFetchMetadata('http://localhost:5173/')).toBe(false)
    expect(shouldFetchMetadata('http://127.0.0.1/')).toBe(false)
    expect(shouldFetchMetadata('http://[::1]/')).toBe(false)
  })

  it('rejects private networks and non-standard ports', () => {
    expect(shouldFetchMetadata('http://192.168.1.2/')).toBe(false)
    expect(shouldFetchMetadata('http://10.0.0.1/')).toBe(false)
    expect(shouldFetchMetadata('https://example.com:8443/')).toBe(false)
  })

  it('allows public http and https urls on default ports', () => {
    expect(shouldFetchMetadata('https://example.com/')).toBe(true)
    expect(shouldFetchMetadata('http://example.com/')).toBe(true)
    expect(shouldFetchMetadata('https://example.com:443/')).toBe(true)
  })
})
