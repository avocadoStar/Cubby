import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'icon'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn-liquid-primary',
  secondary: 'btn-liquid-secondary',
  ghost: 'btn-liquid-ghost',
  danger: 'btn-liquid-danger',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-[13px]',
  md: 'h-11 px-5 text-[13px]',
  icon: 'h-11 w-11 justify-center px-0 text-[13px]',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  className?: string
  leading?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
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
      className={`btn-liquid ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim()}
      {...props}
    >
      {leading ? <span className="flex items-center text-[14px]">{leading}</span> : null}
      {size !== 'icon' ? <span>{children}</span> : children}
    </button>
  )
}
