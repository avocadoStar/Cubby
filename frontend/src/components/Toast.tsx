import { useToastStore } from '../stores/toastStore'

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex w-[calc(100vw-32px)] max-w-[420px] flex-col items-center gap-2 pointer-events-none"
      style={{ transform: 'translateX(-50%)' }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex w-full max-w-full items-center gap-3 px-4 py-2.5 text-body pointer-events-auto"
          style={{
            background: 'var(--app-card)',
            border: 'var(--input-border)',
            borderRadius: 'var(--card-radius)',
            boxShadow: 'var(--shadow-lg)',
            color: 'var(--app-text)',
            animation: 'toast-in 0.2s ease-out',
          }}
        >
          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{toast.message}</span>
          {toast.onUndo && (
            <button
              className="flex-shrink-0 px-2 py-0.5 rounded text-body font-medium cursor-pointer border-none"
              style={{ background: 'var(--accent-light)', color: 'var(--app-accent)' }}
              onClick={() => {
                toast.onUndo?.()
                dismiss(toast.id)
              }}
            >
              {toast.undoLabel ?? '撤销'}
            </button>
          )}
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
