import type { CSSProperties } from 'react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  style?: CSSProperties
}

const sizeClasses = {
  sm: 'w-3.5 h-3.5 border-2',
  md: 'w-4 h-4 border-2',
  lg: 'w-10 h-10 border-2',
}

export default function Spinner({ size = 'md', className = '', style }: SpinnerProps) {
  return (
    <div
      className={`rounded-full border-t-transparent animate-spin border-app-accent ${sizeClasses[size]} ${className}`}
      style={style}
    />
  )
}
