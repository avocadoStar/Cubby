import { create } from 'zustand'

export interface ToastItem {
  id: string
  message: string
  undoLabel?: string
  onUndo?: () => void
}

interface ToastState {
  toasts: ToastItem[]
  show: (toast: Omit<ToastItem, 'id'>) => string
  dismiss: (id: string) => void
}

let nextId = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (toast) => {
    const id = String(++nextId)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))

    // Auto-dismiss after 4s if no undo action, 6s if undo
    const duration = toast.onUndo ? 6000 : 4000
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)

    return id
  },

  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))
