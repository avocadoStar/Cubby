import type { ResolvedTheme } from '../hooks/useThemeMode'

type AnimatedBackgroundProps = {
  theme: ResolvedTheme
}

export function AnimatedBackground({ theme }: AnimatedBackgroundProps) {
  const opacity = theme === 'dark' ? 0.9 : 0.65

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[var(--app-background)]" />
      <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'var(--noise-texture)' }} />

      <div
        className="absolute -left-24 top-[-8%] h-[38rem] w-[38rem] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(0,113,227,0.32), transparent 68%)', opacity }}
      />
      <div
        className="absolute right-[-10%] top-[8%] h-[34rem] w-[34rem] rounded-full blur-[140px]"
        style={{ background: 'radial-gradient(circle, rgba(124,154,255,0.24), transparent 72%)', opacity: opacity * 0.8 }}
      />
      <div
        className="absolute bottom-[-14%] left-[18%] h-[28rem] w-[28rem] rounded-full blur-[130px]"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.32), transparent 70%)', opacity: opacity * 0.6 }}
      />

      <div className="bg-orb-primary" />
      <div className="bg-orb-secondary" />
      <div className="bg-orb-tertiary" />
    </div>
  )
}
