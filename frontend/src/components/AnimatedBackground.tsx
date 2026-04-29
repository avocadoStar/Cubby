import type { ResolvedTheme } from '../hooks/useThemeMode'

type AnimatedBackgroundProps = {
  theme: ResolvedTheme
}

export function AnimatedBackground({ theme }: AnimatedBackgroundProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{ background: theme === 'dark' ? 'var(--color-bg)' : 'var(--color-bg)' }}
    />
  )
}
