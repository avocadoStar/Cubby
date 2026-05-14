export class ConflictError extends Error {
  constructor(message = 'conflict') {
    super(message)
  }
}

export async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text()
  if (!text) return 'conflict'
  try {
    const data = JSON.parse(text) as { error?: unknown }
    if (typeof data.error === 'string' && data.error) return data.error
  } catch {
    // Fall through to the raw response body.
  }
  return text
}
