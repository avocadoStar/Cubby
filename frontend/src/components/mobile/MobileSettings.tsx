import { useThemeStore } from '../../stores/themeStore'
import { useFontSizeStore, type FontSizePreset } from '../../stores/fontSizeStore'
import { useAuthStore } from '../../stores/authStore'
import { themes } from '../../lib/themes'
import { ChevronRight, Power, X } from 'lucide-react'

export default function MobileSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { themeId, setTheme } = useThemeStore()
  const { preset, setPreset } = useFontSizeStore()
  const logout = useAuthStore(s => s.logout)

  if (!open) return null

  return (
    <>
      <div className="absolute inset-0 bg-app-bg z-60 flex flex-col">
        {/* Header */}
        <div className="px-4 pt-7 pb-3.5 flex items-center justify-between bg-app-card border-b border-divider shrink-0">
          <span className="text-[17px] font-semibold text-app-text">设置</span>
          <button onClick={onClose}
            className="w-8 h-8 rounded-button border-none bg-app-hover text-app-text2 cursor-pointer flex items-center justify-center"
            aria-label="关闭">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto [-webkit-overflow-scrolling:touch]">
          {/* Appearance */}
          <div className="bg-app-card border-b border-divider">
            <div className="px-4 pt-4 pb-1.5 text-[11px] font-semibold text-[var(--app-text3)] uppercase tracking-wide">
              外观
            </div>

            {/* Theme selector */}
            <div className="px-4 pt-1">
              <div className="text-[13px] text-app-text2 mb-1.5">主题</div>
            </div>
            <div className="flex gap-2.5 px-4 pt-1 pb-3">
              {themes.map(t => (
                <div key={t.id} onClick={(e) => setTheme(t.id, { x: e.clientX, y: e.clientY })}
                  className="flex-1 py-2.5 px-2 rounded-card cursor-pointer flex flex-col items-center gap-1.5 bg-app-card"
                  style={{ border: `2px solid ${themeId === t.id ? 'var(--app-accent)' : 'var(--app-border)'}` }}>
                  <div className="w-7 h-7 rounded-full"
                    style={{
                      background: t.vars['--bg'],
                      boxShadow: t.id === 'neumorphism'
                        ? t.vars['--shadow']
                        : `0 0 0 1px ${t.vars['--border']}`,
                    }} />
                  <span className="text-[11px] text-app-text2 font-medium">{t.name}</span>
                  {themeId === t.id && (
                    <span className="text-xs text-app-accent font-bold">✓</span>
                  )}
                </div>
              ))}
            </div>

            {/* Font size */}
            <div className="px-4 pt-1 mb-1.5">
              <div className="text-[13px] text-app-text2 mb-1.5">字号</div>
            </div>
            <div className="flex gap-2 px-4 pb-4">
              {(['small', 'medium', 'large'] as FontSizePreset[]).map(p => (
                <div key={p} onClick={() => setPreset(p)}
                  className="flex-1 py-2 rounded-button cursor-pointer text-center bg-app-card"
                  style={{
                    border: `2px solid ${preset === p ? 'var(--app-accent)' : 'var(--app-border)'}`,
                    fontSize: p === 'small' ? 12 : p === 'large' ? 16 : 14,
                    fontWeight: preset === p ? 600 : 400,
                    color: preset === p ? 'var(--app-accent)' : 'var(--app-text2)',
                  }}>
                  {p === 'small' ? '小' : p === 'medium' ? '中' : '大'}
                </div>
              ))}
            </div>
          </div>

          {/* Account */}
          <div className="bg-app-card border-b border-divider">
            <div className="px-4 pt-4 pb-1.5 text-[11px] font-semibold text-[var(--app-text3)] uppercase tracking-wide">
              账户
            </div>
            <SettingsItem icon={<Power size={16} strokeWidth={1.9} />} iconBg="#FEF2F2" iconColor="var(--app-danger)"
              label="退出登录" onClick={logout} />
          </div>
        </div>
      </div>
    </>
  )
}

function SettingsItem({ icon, iconBg, iconColor, label, desc, onClick }: {
  icon: React.ReactNode, iconBg: string, iconColor: string, label: string, desc?: string, onClick: () => void
}) {
  return (
    <div onClick={onClick} className="flex items-center gap-3 py-[13px] px-4 cursor-pointer">
      <div className="w-8 h-8 rounded-button flex items-center justify-center text-base shrink-0"
        style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm text-app-text">{label}</div>
        {desc && <div className="text-[11px] text-[var(--app-text3)] mt-px">{desc}</div>}
      </div>
      <ChevronRight size={14} color="var(--app-text3)" strokeWidth={1.8} />
    </div>
  )
}
