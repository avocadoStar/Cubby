import { isAxiosError } from 'axios'

export function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') {
      return data.error
    }
    if (typeof error.message === 'string' && error.message) {
      return error.message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
