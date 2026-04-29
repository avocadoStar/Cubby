import type { ReactNode, SVGProps } from 'react'

type IconName =
  | 'arrow-left'
  | 'check-circle'
  | 'chevron-down'
  | 'close'
  | 'eye'
  | 'eye-off'
  | 'external-link'
  | 'folder'
  | 'grid'
  | 'grip'
  | 'heart'
  | 'heart-filled'
  | 'link'
  | 'list'
  | 'log-out'
  | 'menu'
  | 'monitor'
  | 'moon'
  | 'pencil'
  | 'plus'
  | 'search'
  | 'settings'
  | 'sparkles'
  | 'star'
  | 'trash'
  | 'upload'

const iconPaths: Record<IconName, ReactNode> = {
  'arrow-left': (
    <>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </>
  ),
  'check-circle': (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  close: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="m3 3 18 18" />
      <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
      <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c6.5 0 10 7 10 7a18.78 18.78 0 0 1-3.34 4.46" />
      <path d="M6.61 6.61A18.7 18.7 0 0 0 2 12s3.5 7 10 7a9.77 9.77 0 0 0 4.24-.92" />
    </>
  ),
  'external-link': (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </>
  ),
  folder: (
    <>
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
    </>
  ),
  grid: (
    <>
      <rect height="7" rx="1.5" width="7" x="3" y="3" />
      <rect height="7" rx="1.5" width="7" x="14" y="3" />
      <rect height="7" rx="1.5" width="7" x="14" y="14" />
      <rect height="7" rx="1.5" width="7" x="3" y="14" />
    </>
  ),
  grip: (
    <>
      <path d="M9 6h.01" />
      <path d="M9 12h.01" />
      <path d="M9 18h.01" />
      <path d="M15 6h.01" />
      <path d="M15 12h.01" />
      <path d="M15 18h.01" />
    </>
  ),
  heart: <path d="m12 20-1.45-1.32C5.4 14 2 10.91 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 2C19.58 2 22 4.42 22 7.5c0 3.41-3.4 6.5-8.55 11.18z" />,
  'heart-filled': <path d="m12 20.4-1.45-1.32C5.4 14.4 2 11.21 2 7.5 2 4.47 4.42 2 7.5 2c1.87 0 3.64.87 4.5 2.24A5.77 5.77 0 0 1 16.5 2C19.58 2 22 4.47 22 7.5c0 3.71-3.4 6.9-8.55 11.56z" />,
  link: (
    <>
      <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 1 1 7 7l-1 1" />
      <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 1 1-7-7l1-1" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h12" />
      <path d="M9 12h12" />
      <path d="M9 18h12" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </>
  ),
  'log-out': (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h10" />
    </>
  ),
  monitor: (
    <>
      <rect height="14" rx="2" width="20" x="2" y="3" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </>
  ),
  moon: <path d="M21 12.79A9 9 0 1 1 11.21 3c0 6.08 4.93 11 11 11 .27 0 .53-.01.79-.03" />,
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21l-4 1 1-4z" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  settings: (
    <>
      <path d="M12 3a2.5 2.5 0 0 1 2.45 2l.18 1.08a7.9 7.9 0 0 1 1.58.66l.96-.53a2.5 2.5 0 1 1 2.5 4.33l-.96.55c.08.53.12 1.08.12 1.64s-.04 1.11-.12 1.64l.96.55a2.5 2.5 0 1 1-2.5 4.33l-.96-.53a7.9 7.9 0 0 1-1.58.66L14.45 19A2.5 2.5 0 1 1 9.55 19l-.18-1.08a7.9 7.9 0 0 1-1.58-.66l-.96.53a2.5 2.5 0 1 1-2.5-4.33l.96-.55A10.8 10.8 0 0 1 5.17 12c0-.56.04-1.11.12-1.64l-.96-.55a2.5 2.5 0 1 1 2.5-4.33l.96.53c.5-.28 1.03-.5 1.58-.66L9.55 5A2.5 2.5 0 0 1 12 3Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
      <path d="m19 16 1 2.5L22.5 20 20 21l-1 2.5L18 21l-2.5-1 2.5-1.5z" />
      <path d="m5 15 .7 1.8L7.5 17l-1.8.7L5 19.5l-.7-1.8L2.5 17l1.8-.7z" />
    </>
  ),
  star: <path d="m12 17.3-6.18 3.25 1.18-6.88L2 8.95l6.91-1L12 1.7l3.09 6.25 6.91 1-5 4.72 1.18 6.88z" />,
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </>
  ),
  upload: (
    <>
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </>
  ),
}

type IconProps = SVGProps<SVGSVGElement> & {
  className?: string
  filled?: boolean
  name: IconName
}

export function Icon({ className = '', filled = false, name, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      height="1em"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      width="1em"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  )
}
