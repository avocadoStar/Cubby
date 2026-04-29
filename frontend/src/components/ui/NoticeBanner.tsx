import { Icon } from './Icon'
import { Surface } from './Surface'

export type Notice = {
  actionLabel?: string
  message: string
  onAction?: () => void
  tone: 'error' | 'success'
}

type NoticeBannerProps = {
  notice: Notice
  onClose: () => void
}

export function NoticeBanner({ notice, onClose }: NoticeBannerProps) {
  return (
    <Surface className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" tone="subtle">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full ${
            notice.tone === 'error'
              ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
              : 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
          }`}
        >
          <Icon className="text-[12px]" name={notice.tone === 'error' ? 'close' : 'check-circle'} />
        </span>
        <p
          className={`text-[13px] leading-5 ${
            notice.tone === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'
          }`}
        >
          {notice.message}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {notice.actionLabel && notice.onAction ? (
          <button
            className="text-left text-[12px] font-medium text-[var(--color-accent)] transition-opacity hover:opacity-80"
            onClick={notice.onAction}
            type="button"
          >
            {notice.actionLabel}
          </button>
        ) : null}

        <button
          className="text-left text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
          onClick={onClose}
          type="button"
        >
          关闭
        </button>
      </div>
    </Surface>
  )
}

type NoticeToastProps = {
  notice: Notice
  onClose: () => void
}

export function NoticeToast({ notice, onClose }: NoticeToastProps) {
  return (
    <Surface className="notice-toast surface-elevated flex items-start gap-3 px-4 py-3" tone="elevated">
      <span
        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          notice.tone === 'error'
            ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
            : 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
        }`}
      >
        <Icon className="text-[12px]" name={notice.tone === 'error' ? 'close' : 'check-circle'} />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] leading-5 ${
            notice.tone === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'
          }`}
        >
          {notice.message}
        </p>
      </div>

      <button
        className="text-left text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
        onClick={onClose}
        type="button"
      >
        关闭
      </button>
    </Surface>
  )
}
