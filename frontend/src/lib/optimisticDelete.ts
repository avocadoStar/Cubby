import { useToastStore } from '../stores/toastStore'

export interface OptimisticDeleteConfig<T> {
  getItem(id: string): T | undefined
  applyDeleting(id: string, item: T): void
  applyRemove(id: string, item: T): void
  applyRestore(id: string, item: T): void
  deleteApi(id: string): Promise<void>
  restoreApi(id: string): Promise<T | null>
  toastMessage(item: T): string
  animationMs?: number
  onApiSuccess?(id: string, item: T): void
  onApiFailure?(id: string, item: T): void
  onUndoFailure?(id: string, item: T, proceedWithDelete: () => void): void
}

export function createOptimisticDelete<T>(config: OptimisticDeleteConfig<T>) {
  return (id: string) => {
    const item = config.getItem(id)
    if (!item) return

    const animMs = config.animationMs ?? 0
    let undoClicked = false
    let removed = false
    let apiSucceeded = false
    let toastShown = false

    let timer: ReturnType<typeof setTimeout> | null = null

    config.applyDeleting(id, item)

    const doRemove = () => {
      if (undoClicked || removed) return
      removed = true
      config.applyRemove(id, item)
    }

    const tryShowToast = () => {
      if (!apiSucceeded || !removed || undoClicked || toastShown) return
      toastShown = true
      useToastStore.getState().show({
        message: config.toastMessage(item),
        onUndo: () => {
          if (undoClicked) return
          undoClicked = true
          if (timer !== null) clearTimeout(timer)
          config.restoreApi(id).then((restored) => {
            if (restored) config.applyRestore(id, restored)
          }).catch(() => {
            if (config.onUndoFailure) {
              undoClicked = false
              config.onUndoFailure(id, item, doRemove)
            } else {
              config.applyRestore(id, item)
            }
          })
        },
      })
    }

    if (animMs > 0) {
      timer = setTimeout(() => {
        doRemove()
        tryShowToast()
      }, animMs)
    } else {
      doRemove()
    }

    config.deleteApi(id).then(() => {
      if (undoClicked) return
      apiSucceeded = true
      if (config.onApiSuccess) config.onApiSuccess(id, item)
      tryShowToast()
    }).catch(() => {
      if (undoClicked) return
      undoClicked = true
      if (timer !== null) clearTimeout(timer)
      if (config.onApiFailure) {
        config.onApiFailure(id, item)
      } else {
        config.applyRestore(id, item)
      }
    })
  }
}
