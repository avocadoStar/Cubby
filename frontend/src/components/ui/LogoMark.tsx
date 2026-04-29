import type { SVGProps } from 'react'

type LogoMarkProps = SVGProps<SVGSVGElement> & {
  compact?: boolean
}

export function LogoMark({ className = '', compact = false, ...props }: LogoMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 64 64"
      {...props}
    >
      <rect x="8" y="10" width="48" height="44" rx="12" fill="currentColor" opacity="0.12" />
      <path
        d="M18 22C18 18.686 20.686 16 24 16H30L36 22H46C49.314 22 52 24.686 52 28V42C52 45.314 49.314 48 46 48H24C20.686 48 18 45.314 18 42V22Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M24 32H42" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 39H36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      {!compact ? <path d="M34 16V24H42" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  )
}
