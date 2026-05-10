import { ConflictError } from '../services/api'
import { useToastStore } from '../stores/toastStore'

export function handleMoveError(error: unknown): string {
  return error instanceof ConflictError
    ? error.message
    : '移动失败，请重试'
}

export function showMoveError(error: unknown) {
  useToastStore.getState().show({ message: handleMoveError(error) })
}
