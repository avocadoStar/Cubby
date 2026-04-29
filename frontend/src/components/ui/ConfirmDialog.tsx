import { Button } from './Button'
import { Modal } from './Modal'

type ConfirmDialogProps = {
  confirmLabel?: string
  description: string
  onClose: () => void
  onConfirm: () => void
  open: boolean
  title: string
}

export function ConfirmDialog({
  confirmLabel = '确认',
  description,
  onClose,
  onConfirm,
  open,
  title,
}: ConfirmDialogProps) {
  return (
    <Modal onClose={onClose} open={open} title={title} width="md">
      <div className="space-y-4">
        <p className="text-[14px] leading-6 text-[var(--color-text-secondary)]">{description}</p>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} size="sm" variant="secondary">
            取消
          </Button>
          <Button onClick={onConfirm} size="sm" variant="danger">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
