import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

type InputBaseProps = {
  className?: string
  helper?: string
  label?: string
  trailing?: ReactNode
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
  delete clone.multiline
  return clone
}

export function Input(props: InputProps) {
  const { className = '', helper, label, trailing } = props

  if ('multiline' in props && props.multiline) {
    const textareaProps = sanitizeInputProps(props) as TextareaHTMLAttributes<HTMLTextAreaElement>

    return (
      <label className="block space-y-2">
        {label ? <span className="text-[12px] font-medium text-[var(--text-tertiary)]">{label}</span> : null}
        <div className="relative">
          <textarea
            {...textareaProps}
            className={`input-liquid min-h-[112px] resize-none py-3 ${className}`.trim()}
          />
          {trailing ? (
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">{trailing}</div>
          ) : null}
        </div>
        {helper ? <p className="text-[12px] text-[var(--text-quaternary)]">{helper}</p> : null}
      </label>
    )
  }

  const inputProps = sanitizeInputProps(props) as InputHTMLAttributes<HTMLInputElement>

  return (
    <label className="block space-y-2">
      {label ? <span className="text-[12px] font-medium text-[var(--text-tertiary)]">{label}</span> : null}
      <div className="relative">
        <input {...inputProps} className={`input-liquid h-12 ${className}`.trim()} />
        {trailing ? <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">{trailing}</div> : null}
      </div>
      {helper ? <p className="text-[12px] text-[var(--text-quaternary)]">{helper}</p> : null}
    </label>
  )
}
