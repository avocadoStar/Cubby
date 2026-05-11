import { useThemeStore } from '../../stores/themeStore'
import { useFontSizeStore, type FontSizePreset } from '../../stores/fontSizeStore'
import { useAuthStore } from '../../stores/authStore'
import { themes } from '../../lib/themes'

export default function MobileSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { themeId, setTheme } = useThemeStore()
  const { preset, setPreset } = useFontSizeStore()
  const logout = useAuthStore(s => s.logout)

  if (!open) return null

  return (
    <>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'var(--app-bg)', zIndex: 60,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '28px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--app-card)', borderBottom: '1px solid var(--divider-color)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--app-text)' }}>设置</span>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'var(--app-hover)', color: 'var(--app-text2)', fontSize: 16,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Appearance */}
          <div style={{ background: 'var(--app-card)', borderBottom: '1px solid var(--divider-color)' }}>
            <div style={{ padding: '16px 16px 6px', fontSize: 11, fontWeight: 600, color: 'var(--app-text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              外观
            </div>

            {/* Theme selector */}
            <div style={{ padding: '4px 16px 0' }}>
              <div style={{ fontSize: 13, color: 'var(--app-text2)', marginBottom: 6 }}>主题</div>
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '4px 16px 12px' }}>
              {themes.map(t => (
                <div key={t.id} onClick={(e) => setTheme(t.id, { x: e.clientX, y: e.clientY })} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10,
                  border: `2px solid ${themeId === t.id ? 'var(--app-accent)' : 'var(--app-border)'}`,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 6, background: 'var(--app-card)',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: t.vars['--bg'],
                    boxShadow: t.id === 'neumorphism'
                      ? t.vars['--shadow']
                      : `0 0 0 1px ${t.vars['--border']}`,
                  }} />
                  <span style={{ fontSize: 11, color: 'var(--app-text2)', fontWeight: 500 }}>{t.name}</span>
                  {themeId === t.id && (
                    <span style={{ fontSize: 12, color: 'var(--app-accent)', fontWeight: 700 }}>✓</span>
                  )}
                </div>
              ))}
            </div>

            {/* Font size */}
            <div style={{ padding: '4px 16px 0', marginBottom: 6 }}>
              <div style={{ fontSize: 13, color: 'var(--app-text2)', marginBottom: 6 }}>字号</div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
              {(['small', 'medium', 'large'] as FontSizePreset[]).map(p => (
                <div key={p} onClick={() => setPreset(p)} style={{
                  flex: 1, padding: '8px', borderRadius: 8,
                  border: `2px solid ${preset === p ? 'var(--app-accent)' : 'var(--app-border)'}`,
                  cursor: 'pointer', textAlign: 'center',
                  fontSize: p === 'small' ? 12 : p === 'large' ? 16 : 14,
                  fontWeight: preset === p ? 600 : 400,
                  color: preset === p ? 'var(--app-accent)' : 'var(--app-text2)',
                  background: 'var(--app-card)',
                }}>
                  {p === 'small' ? '小' : p === 'medium' ? '中' : '大'}
                </div>
              ))}
            </div>
          </div>

          {/* Account */}
          <div style={{ background: 'var(--app-card)', borderBottom: '1px solid var(--divider-color)' }}>
            <div style={{ padding: '16px 16px 6px', fontSize: 11, fontWeight: 600, color: 'var(--app-text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              账户
            </div>
            <SettingsItem icon="⏻" iconBg="#FEF2F2" iconColor="var(--app-danger)"
              label="退出登录" onClick={logout} />
          </div>
        </div>
      </div>
    </>
  )
}

function SettingsItem({ icon, iconBg, iconColor, label, desc, onClick }: {
  icon: string, iconBg: string, iconColor: string, label: string, desc?: string, onClick: () => void
}) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: iconBg, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: 'var(--app-text)' }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--app-text3)', marginTop: 1 }}>{desc}</div>}
      </div>
      <span style={{ color: 'var(--app-text3)', fontSize: 14 }}>›</span>
    </div>
  )
}
