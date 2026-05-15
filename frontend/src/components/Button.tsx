import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Spinner from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
}

const variantStyle: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--app-accent)',
    color: 'var(--text-on-accent)',
    border: 'none',
    boxShadow: 'var(--shadow)',
    fontWeight: 500,
  },
  secondary: {
    background: 'var(--app-card)',
    color: 'var(--app-text)',
    border: 'var(--input-border)',
    boxShadow: 'var(--shadow)',
  },
  danger: {
    background: 'var(--app-danger)',
    color: 'var(--text-on-accent)',
    border: 'none',
    boxShadow: 'var(--shadow)',
    fontWeight: 500,
  },
  ghost: {
    background: 'transparent',
    color: 'var(--app-text)',
    border: 'none',
  },
  icon: {
    background: 'transparent',
    color: 'var(--app-text)',
    border: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}

const sizeStyle: Record<ButtonSize, React.CSSProperties> = {
  sm: { height: 28, padding: '0 10px', fontSize: 'var(--fs--1)' },
  md: { height: 32, padding: '0 16px', fontSize: 'var(--fs-body)' },
  lg: { height: 40, padding: '0 20px', fontSize: 'var(--fs-body)' },
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      data-variant={variant}
      className={`cubby-button inline-flex items-center justify-center gap-1.5 rounded-button cursor-pointer font-medium
        disabled:opacity-50 disabled:cursor-not-allowed
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]
        ${className}`}
      style={{
        ...variantStyle[variant],
        ...sizeStyle[size],
        borderRadius: 'var(--btn-radius)',
        transition: `background var(--motion-duration-fast) var(--motion-easing-standard), box-shadow var(--motion-duration-fast) var(--motion-easing-standard), opacity var(--motion-duration-fast) var(--motion-easing-standard), transform var(--motion-duration-fast) var(--motion-easing-standard)`,
        ...style,
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner size="md" className="flex-shrink-0" style={{ borderColor: 'currentColor' }} />
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  )
}
