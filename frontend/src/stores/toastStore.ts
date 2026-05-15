import { create } from 'zustand'

export interface ToastItem {
  id: string
  message: string
  undoLabel?: string
  onUndo?: () => void
}

interface ToastState {
  toasts: ToastItem[]
  exitingIds: Set<string>
  timers: Map<string, ReturnType<typeof setTimeout>>
  show: (toast: Omit<ToastItem, 'id'>) => string
  dismiss: (id: string) => void
}

const EXIT_MS = 200

let nextId = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  exitingIds: new Set(),
  timers: new Map(),

  show: (toast) => {
    const id = String(++nextId)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))

    const duration = toast.onUndo ? 6000 : 4000
    const exit = () => {
      set((s) => ({ exitingIds: new Set([...s.exitingIds, id]) }))
      setTimeout(() => {
        set((s) => ({
          toasts: s.toasts.filter((t) => t.id !== id),
          exitingIds: new Set([...s.exitingIds].filter((x) => x !== id)),
        }))
        get().timers.delete(id)
      }, EXIT_MS)
    }

    const timer = setTimeout(exit, duration)
    set((s) => { s.timers.set(id, timer); return { timers: s.timers } })

    return id
  },

  dismiss: (id) => {
    const timer = get().timers.get(id)
    if (timer) { clearTimeout(timer); get().timers.delete(id) }
    set((s) => ({ exitingIds: new Set([...s.exitingIds, id]) }))
    setTimeout(() => {
      set((s) => ({
        toasts: s.toasts.filter((t) => t.id !== id),
        exitingIds: new Set([...s.exitingIds].filter((x) => x !== id)),
      }))
    }, EXIT_MS)
  },
}))
