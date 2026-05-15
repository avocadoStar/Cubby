import { type FormEvent, type ReactNode } from 'react'
import ModalBase from './ModalBase'
import Button from './Button'

interface FormModalProps {
  title: string
  onClose: () => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  submitLabel: string
  submitDisabled?: boolean
  submitLoading?: boolean
  cancelDisabled?: boolean
  width?: string
  children: ReactNode
}

export default function FormModal({
  title,
  onClose,
  onSubmit,
  submitLabel,
  submitDisabled = false,
  submitLoading = false,
  cancelDisabled = false,
  width,
  children,
}: FormModalProps) {
  return (
    <ModalBase
      title={title}
      onClose={onClose}
      width={width}
      closeOnEscape={!submitLoading}
      closeOnOverlayClick={false}
    >
      <form onSubmit={onSubmit}>
        {children}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={cancelDisabled || submitLoading}>取消</Button>
          <Button variant="primary" type="submit" loading={submitLoading} disabled={submitDisabled}>{submitLabel}</Button>
        </div>
      </form>
    </ModalBase>
  )
}
