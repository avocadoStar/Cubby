import { describe, expect, it } from 'vitest'
import { ConflictError, readErrorMessage } from './apiErrors'

describe('api error helpers', () => {
  it('reads JSON error messages from failed responses', async () => {
    const res = new Response(JSON.stringify({ error: 'export failed' }), { status: 500 })

    await expect(readErrorMessage(res)).resolves.toBe('export failed')
  })

  it('falls back to raw response text when the body is not JSON', async () => {
    const res = new Response('plain failure', { status: 500 })

    await expect(readErrorMessage(res)).resolves.toBe('plain failure')
  })

  it('uses the default conflict message for empty conflict bodies', () => {
    expect(new ConflictError().message).toBe('conflict')
  })
})
