import { Icon } from './Icon'
import { Surface } from './Surface'

export type Notice = {
  message: string
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
