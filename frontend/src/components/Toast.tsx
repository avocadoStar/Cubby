import { useToastStore } from '../stores/toastStore'

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex flex-col items-center gap-2"
      style={{ transform: 'translateX(-50%)' }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 px-4 py-2.5 text-body"
          style={{
            background: 'var(--app-card)',
            border: 'var(--input-border)',
            borderRadius: 'var(--card-radius)',
            boxShadow: 'var(--shadow-lg)',
            color: 'var(--app-text)',
            animation: 'toast-in 0.2s ease-out',
          }}
        >
          <span>{toast.message}</span>
          {toast.onUndo && (
            <button
              className="px-2 py-0.5 rounded text-body font-medium cursor-pointer border-none"
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
