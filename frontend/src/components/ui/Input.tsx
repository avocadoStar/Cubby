import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

type InputBaseProps = {
  className?: string
  helper?: string
  label?: string
  trailing?: ReactNode
  trailingInteractive?: boolean
}

type TextInputProps = InputBaseProps &
  InputHTMLAttributes<HTMLInputElement> & {
    multiline?: false
  }

type TextAreaProps = InputBaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    multiline: true
  }

type InputProps = TextInputProps | TextAreaProps

function sanitizeInputProps<T extends object>(value: T) {
  const clone = { ...value } as Record<string, unknown>
  delete clone.className
  delete clone.helper
  delete clone.label
  delete clone.trailing
  delete clone.trailingInteractive
  delete clone.multiline
  return clone
}

export function Input(props: InputProps) {
  const { className = '', helper, label, trailing, trailingInteractive = false } = props
  const trailingSpacingClass = trailing ? 'pr-11' : ''

  if ('multiline' in props && props.multiline) {
    const textareaProps = sanitizeInputProps(props) as TextareaHTMLAttributes<HTMLTextAreaElement>

    return (
      <label className="block space-y-2.5">
        {label ? <span className="text-[13px] font-medium text-[var(--color-text)]">{label}</span> : null}
        <div className="relative">
          <textarea
            {...textareaProps}
            className={`input-flat min-h-[96px] resize-none px-3 py-2.5 text-[14px] leading-6 ${trailingSpacingClass} ${className}`.trim()}
          />
          {trailing ? (
            <div className={`absolute inset-y-0 right-2 flex items-center ${trailingInteractive ? '' : 'pointer-events-none'}`.trim()}>
              {trailing}
            </div>
          ) : null}
        </div>
        {helper ? <p className="text-[12px] leading-5 text-[var(--color-text-secondary)]">{helper}</p> : null}
      </label>
    )
  }

  const inputProps = sanitizeInputProps(props) as InputHTMLAttributes<HTMLInputElement>

  return (
    <label className="block space-y-2.5">
      {label ? <span className="text-[13px] font-medium text-[var(--color-text)]">{label}</span> : null}
      <div className="relative">
        <input {...inputProps} className={`input-flat h-9 px-3 text-[14px] ${trailingSpacingClass} ${className}`.trim()} />
        {trailing ? (
          <div className={`absolute inset-y-0 right-2 flex items-center ${trailingInteractive ? '' : 'pointer-events-none'}`.trim()}>
            {trailing}
          </div>
        ) : null}
      </div>
      {helper ? <p className="text-[12px] leading-5 text-[var(--color-text-secondary)]">{helper}</p> : null}
    </label>
  )
}
