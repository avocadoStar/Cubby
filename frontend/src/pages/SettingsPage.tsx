import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThemeMode } from '../hooks/useThemeMode'
import { useSettingsStore } from '../stores/settingsStore'
import { getErrorMessage } from '../utils/errors'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Surface } from '../components/ui/Surface'

type FormState = {
  apiKey: string
  baseUrl: string
  model: string
}

type Feedback = {
  tone: 'error' | 'success'
  message: string
} | null

const defaultForm: FormState = {
  baseUrl: '',
  apiKey: '',
  model: '',
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { fetchSettings, updateSettings, testAI, loading, error } = useSettingsStore()
  const { themeMode, setThemeMode } = useThemeMode()
  const [form, setForm] = useState<FormState>(defaultForm)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  useEffect(() => {
    void fetchSettings()
      .then((settings) => {
        setForm({
          baseUrl: settings.ai_base_url ?? '',
          apiKey: settings.ai_api_key && !settings.ai_api_key.includes('****') ? settings.ai_api_key : '',
          model: settings.ai_model ?? 'gpt-4o-mini',
        })
      })
      .catch((fetchError: unknown) => {
        setFeedback({ tone: 'error', message: getErrorMessage(fetchError, '加载设置失败') })
      })
  }, [fetchSettings])

  const persistSettings = async () => {
    const payload: Record<string, string> = {
      ai_provider: 'openai',
      ai_base_url: form.baseUrl.trim(),
      ai_model: form.model.trim(),
    }

    if (form.apiKey.trim() && !form.apiKey.includes('****')) {
      payload.ai_api_key = form.apiKey.trim()
    }

    await updateSettings(payload)
  }

  const handleSave = async () => {
    setSaving(true)
    setFeedback(null)

    try {
      await persistSettings()
      setFeedback({ tone: 'success', message: '设置已保存。' })
      return true
    } catch (saveError: unknown) {
      setFeedback({ tone: 'error', message: getErrorMessage(saveError, '保存设置失败') })
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    const saved = await handleSave()
    if (!saved) {
      return
    }
    setTesting(true)

    try {
      const result = await testAI()
      setFeedback({ tone: result.ok ? 'success' : 'error', message: result.message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="scroll-fade h-full overflow-y-auto px-5 py-5 lg:px-7 lg:py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[12px] uppercase tracking-[0.24em] text-[var(--text-quaternary)]">Preference Center</div>
            <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.05em] text-[var(--text-primary)]">AI 与界面偏好</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[var(--text-tertiary)]">
              在这里配置 AI 服务连接、默认模型，以及当前设备上的界面显示模式。保存只会更新现有业务配置，不会改变数据结构。
            </p>
          </div>

          <Button leading="←" onClick={() => navigate('/')} variant="secondary">
            返回首页
          </Button>
        </div>

        {feedback ? (
          <Surface className="px-4 py-3" tone="subtle">
            <p className={`text-[13px] ${feedback.tone === 'error' ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
              {feedback.message}
            </p>
          </Surface>
        ) : null}

        {error && !feedback ? (
          <Surface className="px-4 py-3" tone="subtle">
            <p className="text-[13px] text-[var(--danger)]">{error}</p>
          </Surface>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <Surface className="space-y-6 p-6 lg:p-7" tone="elevated">
            <div>
              <div className="text-[12px] uppercase tracking-[0.22em] text-[var(--text-quaternary)]">AI Connection</div>
              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">服务连接</h2>
              <p className="mt-2 text-[14px] leading-7 text-[var(--text-tertiary)]">
                Cubby 会直接使用你在这里填写的 API 参数进行测试和整理操作。未修改的密钥不会重复覆盖。
              </p>
            </div>

            <div className="grid gap-4">
              <Input
                helper="支持官方 OpenAI 接口或兼容 OpenAI 的自定义网关。"
                label="API 地址"
                onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value }))}
                placeholder="https://api.openai.com/v1"
                value={form.baseUrl}
              />

              <Input
                helper="如果后端返回的是脱敏密钥，这里留空即可，不会影响保存。"
                label="API Key"
                onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))}
                placeholder="sk-..."
                type={showKey ? 'text' : 'password'}
                value={form.apiKey}
              />

              <div className="flex justify-end">
                <Button onClick={() => setShowKey((current) => !current)} size="sm" variant="ghost">
                  {showKey ? '隐藏密钥' : '显示密钥'}
                </Button>
              </div>

              <Input
                helper="建议填写你计划用于整理与分类的模型名称。"
                label="模型名称"
                onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
                placeholder="gpt-4o-mini"
                value={form.model}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button disabled={loading || saving || testing} onClick={() => void handleTest()} variant="secondary">
                {testing ? '测试中…' : '测试连接'}
              </Button>
              <Button disabled={loading || saving} onClick={() => void handleSave()} variant="primary">
                {saving ? '保存中…' : '保存设置'}
              </Button>
            </div>
          </Surface>

          <div className="space-y-6">
            <Surface className="space-y-5 p-6 lg:p-7" tone="panel">
              <div>
                <div className="text-[12px] uppercase tracking-[0.22em] text-[var(--text-quaternary)]">Appearance</div>
                <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">显示模式</h2>
                <p className="mt-2 text-[14px] leading-7 text-[var(--text-tertiary)]">
                  界面主题是本地偏好，不影响业务数据。切换后会立即生效，并保持当前 Liquid Glass 视觉语言。
                </p>
              </div>

              <div className="grid gap-3">
                <ThemeButton active={themeMode === 'system'} label="跟随系统" onClick={() => setThemeMode('system')} />
                <ThemeButton active={themeMode === 'light'} label="浅色模式" onClick={() => setThemeMode('light')} />
                <ThemeButton active={themeMode === 'dark'} label="深色模式" onClick={() => setThemeMode('dark')} />
              </div>
            </Surface>

            <Surface className="space-y-4 p-6 lg:p-7" tone="subtle">
              <div className="text-[12px] uppercase tracking-[0.22em] text-[var(--text-quaternary)]">Notes</div>
              <ul className="space-y-3 text-[13px] leading-6 text-[var(--text-tertiary)]">
                <li>连接测试会先保存当前表单，再调用后端的 AI 测试接口。</li>
                <li>如果没有提供密钥，后端会返回明确的业务错误提示，而不是模糊失败。</li>
                <li>保存不会扩展业务模型，只会更新现有 `settings` 配置。</li>
              </ul>
            </Surface>
          </div>
        </div>
      </div>
    </div>
  )
}

function ThemeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`flex items-center justify-between rounded-[22px] px-4 py-4 text-left transition ${
        active ? 'bg-[rgba(0,113,227,0.18)] text-[var(--text-primary)] shadow-soft' : 'bg-white/7 text-[var(--text-secondary)] hover:bg-white/10'
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="text-[14px] font-medium">{label}</span>
      <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-[var(--accent)]' : 'bg-white/20'}`} />
    </button>
  )
}
