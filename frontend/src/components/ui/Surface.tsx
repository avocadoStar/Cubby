import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

type SurfaceTone = 'panel' | 'elevated' | 'subtle'

const toneClasses: Record<SurfaceTone, string> = {
  panel: 'glass-panel shadow-soft',
  elevated: 'glass-panel glass-panel-elevated shadow-float',
  subtle: 'glass-panel glass-panel-subtle shadow-soft',
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
