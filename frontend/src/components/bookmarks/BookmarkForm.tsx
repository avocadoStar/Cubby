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
  favoriteLabel = '添加后同时标记为收藏',
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
          label="链接地址"
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
        label="标题"
        onChange={(event) => onChange({ title: event.target.value })}
        placeholder="留空时会优先使用链接地址"
        value={draft.title}
      />

      <Input
        label="备注"
        multiline
        onChange={(event) => onChange({ description: event.target.value })}
        placeholder="可选：记录用途、重点或使用场景"
        value={draft.description}
      />

      <FolderCascadePicker
        folders={folders}
        helper="左侧点中某一级，右侧就会展开下一层。点到哪一级，就保存到哪一级。"
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
          取消
        </Button>
        <Button disabled={submitting} size="sm" type="submit" variant="primary">
          {submitting ? '保存中…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
