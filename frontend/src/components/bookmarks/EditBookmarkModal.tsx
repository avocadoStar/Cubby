import type { FormEvent } from 'react'
import type { Folder } from '../../types'
import { Modal } from '../ui/Modal'
import { BookmarkForm } from './BookmarkForm'
import type { BookmarkDraft } from './types'

type EditBookmarkModalProps = {
  draft: BookmarkDraft
  folders: Folder[]
  onChange: (patch: Partial<BookmarkDraft>) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  open: boolean
  submitting: boolean
}

export function EditBookmarkModal(props: EditBookmarkModalProps) {
  return (
    <Modal onClose={props.onClose} open={props.open} title="编辑书签" width="md">
      <BookmarkForm
        draft={props.draft}
        favoriteLabel="标记为收藏"
        folders={props.folders}
        onCancel={props.onClose}
        onChange={props.onChange}
        onSubmit={props.onSubmit}
        submitLabel="更新书签"
        submitting={props.submitting}
      />
    </Modal>
  )
}
