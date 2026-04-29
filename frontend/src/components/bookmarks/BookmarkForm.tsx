import type { FormEvent } from 'react'
import type { Folder } from '../../types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { FolderCascadePicker } from './FolderCascadePicker'
import type { BookmarkDraft } from './types'

type BookmarkFormProps = {
  draft: BookmarkDraft
  favoriteLabel?: string
  folders: Folder[]
  onCancel: () => void
  onChange: (patch: Partial<BookmarkDraft>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onUrlBlur?: () => void
  submitLabel: string
  submitting: boolean
  titleFetchMessage?: string
  titleFetchState?: 'failed' | 'fetching' | 'idle' | 'success'
}

export function BookmarkForm({
  draft,
  favoriteLabel = '娣诲姞鍚庡悓鏃舵爣璁颁负鏀惰棌',
  folders,
  onCancel,
  onChange,
  onSubmit,
  onUrlBlur,
  submitLabel,
  submitting,
  titleFetchMessage,
  titleFetchState = 'idle',
}: BookmarkFormProps) {
  const titleFetchToneClass =
    titleFetchState === 'failed'
      ? 'text-[var(--color-danger)]'
      : titleFetchState === 'success'
        ? 'text-[var(--color-success)]'
        : 'text-[var(--color-text-secondary)]'

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Input
          label="閾炬帴鍦板潃"
          onBlur={onUrlBlur}
          onChange={(event) => onChange({ url: event.target.value })}
          placeholder="https://example.com"
          value={draft.url}
        />
        {titleFetchMessage ? (
          <p className={`text-[12px] leading-5 ${titleFetchToneClass}`}>{titleFetchMessage}</p>
        ) : null}
      </div>

      <Input
        label="鏍囬"
        onChange={(event) => onChange({ title: event.target.value })}
        placeholder="鐣欑┖鏃朵細浼樺厛浣跨敤閾炬帴鍦板潃"
        value={draft.title}
      />

      <Input
        label="澶囨敞"
        multiline
        onChange={(event) => onChange({ description: event.target.value })}
        placeholder="鍙€夛細璁板綍鐢ㄩ€斻€侀噸鐐规垨浣跨敤鍦烘櫙"
        value={draft.description}
      />

      <FolderCascadePicker
        folders={folders}
        helper="宸︿晶鐐逛腑鏌愪竴绾э紝鍙充晶灏变細灞曞紑涓嬩竴灞傘€傜偣鍒板摢涓€绾э紝灏变繚瀛樺埌鍝竴绾с€?"
        onChange={(folderId) => onChange({ folderId })}
        value={draft.folderId}
      />

      <label className="page-section-muted flex items-center gap-3 px-3 py-2.5 text-[13px] text-[var(--color-text-secondary)]">
        <input
          checked={draft.isFavorite}
          className="h-4 w-4 accent-[var(--color-accent)]"
          onChange={(event) => onChange({ isFavorite: event.target.checked })}
          type="checkbox"
        />
        {favoriteLabel}
      </label>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button onClick={onCancel} size="sm" type="button" variant="secondary">
          鍙栨秷
        </Button>
        <Button disabled={submitting} size="sm" type="submit" variant="primary">
          {submitting ? '淇濆瓨涓€?' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
