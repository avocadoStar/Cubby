import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'icon'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn-flat-primary',
  secondary: 'btn-flat-secondary',
  ghost: 'btn-flat-ghost',
  danger: 'btn-flat-danger',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-9 px-3 text-[13px]',
  icon: 'h-9 w-9 justify-center px-0 text-[13px]',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  className?: string
  leading?: ReactNode
  size?: ButtonSize
  variant?: ButtonVariant
}

export function Button({
  children,
  className = '',
  leading,
  size = 'md',
  variant = 'secondary',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn-flat ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim()}
      {...props}
    >
      {leading ? <span className="flex shrink-0 items-center text-[14px] leading-none">{leading}</span> : null}
      {size !== 'icon' ? <span className="truncate">{children}</span> : children}
    </button>
  )
}
