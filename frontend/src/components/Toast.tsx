import { useToastStore } from '../stores/toastStore'

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const exitingIds = useToastStore((s) => s.exitingIds)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 flex w-[calc(100vw-32px)] max-w-[420px] flex-col items-center gap-2 pointer-events-none -translate-x-1/2"
    >
      {toasts.map((toast) => {
        const isExiting = exitingIds.has(toast.id)
        return (
          <div
            key={toast.id}
            className="flex w-full max-w-full items-center gap-3 px-4 py-2.5 text-body pointer-events-auto bg-app-card rounded-card shadow-app-lg text-app-text"
            style={{
              border: 'var(--input-border)',
              animation: isExiting
                ? 'toast-out 0.18s ease-in forwards'
                : 'toast-in 0.2s ease-out',
            }}
          >
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{toast.message}</span>
            {toast.onUndo && (
              <button
                className="flex-shrink-0 px-2 py-0.5 rounded text-body font-medium cursor-pointer border-none bg-accent-light text-app-accent"
                onClick={() => {
                  toast.onUndo?.()
                  dismiss(toast.id)
                }}
              >
                {toast.undoLabel ?? '撤销'}
              </button>
            )}
          </div>
        )
      })}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toast-out {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(-4px) scale(0.96); }
        }
      `}</style>
    </div>
  )
}
