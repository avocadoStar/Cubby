import { forwardRef, type InputHTMLAttributes, type CSSProperties } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'style'> {
  error?: boolean
  inputStyle?: CSSProperties
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  error = false,
  className = '',
  inputStyle,
  ...props
}, ref) => {
  return (
    <input
      ref={ref}
      className={`w-full h-9 px-3 rounded-input outline-none bg-input-bg text-app-text shadow-input-base transition-shadow text-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text2)] ${error ? 'mb-1' : 'mb-4'} ${className}`}
      style={{
        border: error ? '1px solid var(--app-danger)' : 'var(--input-border)',
        ...inputStyle,
      }}
      {...props}
    />
  )
})

Input.displayName = 'Input'
export default Input
