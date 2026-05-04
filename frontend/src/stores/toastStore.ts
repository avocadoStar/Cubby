import { create } from 'zustand'

export interface ToastItem {
  id: string
  message: string
  undoLabel?: string
  onUndo?: () => void
}

interface ToastState {
  toasts: ToastItem[]
  timers: Map<string, ReturnType<typeof setTimeout>>
  show: (toast: Omit<ToastItem, 'id'>) => string
  dismiss: (id: string) => void
}

let nextId = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  timers: new Map(),

  show: (toast) => {
    const id = String(++nextId)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))

    const duration = toast.onUndo ? 6000 : 4000
    const timer = setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      get().timers.delete(id)
    }, duration)
    set((s) => { s.timers.set(id, timer); return { timers: s.timers } })

    return id
  },

  dismiss: (id) => {
    const timer = get().timers.get(id)
    if (timer) { clearTimeout(timer); get().timers.delete(id) }
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))
