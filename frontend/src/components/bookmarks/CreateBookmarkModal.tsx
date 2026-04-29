import type { FormEvent } from 'react'
import type { Folder } from '../../types'
import { Modal } from '../ui/Modal'
import { BookmarkForm } from './BookmarkForm'
import type { BookmarkDraft } from './types'

type CreateBookmarkModalProps = {
  draft: BookmarkDraft
  folders: Folder[]
  onChange: (patch: Partial<BookmarkDraft>) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onUrlBlur: () => void
  open: boolean
  submitting: boolean
  titleFetchMessage?: string
  titleFetchState?: 'failed' | 'fetching' | 'idle' | 'success'
}

export function CreateBookmarkModal(props: CreateBookmarkModalProps) {
  return (
    <Modal onClose={props.onClose} open={props.open} title="添加书签" width="md">
      <BookmarkForm
        draft={props.draft}
        folders={props.folders}
        onCancel={props.onClose}
        onChange={props.onChange}
        onSubmit={props.onSubmit}
        onUrlBlur={props.onUrlBlur}
        submitLabel="保存书签"
        submitting={props.submitting}
        titleFetchMessage={props.titleFetchMessage}
        titleFetchState={props.titleFetchState}
      />
    </Modal>
  )
}
