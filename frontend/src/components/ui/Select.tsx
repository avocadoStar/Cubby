import type { ReactNode, SelectHTMLAttributes } from 'react'

type SelectOption = {
  label: string
  value: string
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  helper?: string
  label?: string
  options: SelectOption[]
  placeholder?: string
  prefix?: ReactNode
}

export function Select({ helper, label, options, placeholder, prefix, className = '', ...props }: SelectProps) {
  return (
    <label className="block space-y-2.5">
      {label ? <span className="text-[13px] font-medium text-[var(--color-text)]">{label}</span> : null}
      <div className="relative">
        {prefix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">{prefix}</span> : null}
        <select
          {...props}
          className={`input-flat form-select h-9 px-3 text-[14px] ${prefix ? 'pl-9' : ''} ${className}`.trim()}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {helper ? <p className="text-[12px] leading-5 text-[var(--color-text-secondary)]">{helper}</p> : null}
    </label>
  )
}
