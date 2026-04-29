import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

type SurfaceTone = 'panel' | 'elevated' | 'subtle'

const toneClasses: Record<SurfaceTone, string> = {
  panel: 'surface-panel',
  elevated: 'surface-elevated',
  subtle: 'surface-subtle',
}

type SurfaceProps<T extends ElementType> = {
  as?: T
  children: ReactNode
  className?: string
  tone?: SurfaceTone
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>

export function Surface<T extends ElementType = 'div'>({
  as,
  children,
  className = '',
  tone = 'panel',
  ...props
}: SurfaceProps<T>) {
  const Component = as ?? 'div'

  return (
    <Component className={`${toneClasses[tone]} ${className}`.trim()} {...props}>
      {children}
    </Component>
  )
}
