import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { Input } from '../components/ui/Input'
import { NoticeBanner } from '../components/ui/NoticeBanner'
import type { Notice } from '../components/ui/NoticeBanner'
import { Surface } from '../components/ui/Surface'
import { useSettingsMutations, useSettingsQuery } from '../hooks/useSettingsQueries'
import { useThemeMode } from '../hooks/useThemeMode'
import { getErrorMessage } from '../utils/errors'

type FormState = {
  apiKey: string
  baseUrl: string
  model: string
}

const defaultForm: FormState = {
  baseUrl: '',
  apiKey: '',
  model: '',
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { data, error, isLoading } = useSettingsQuery()
  const { updateSettings, testAI } = useSettingsMutations()
  const { themeMode, setThemeMode } = useThemeMode()
  const [draft, setDraft] = useState<FormState | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [feedback, setFeedback] = useState<Notice | null>(null)
  const initialForm = useMemo(() => {
    const settings = data?.settings
    if (!settings) {
      return defaultForm
    }

    return {
      baseUrl: settings.ai_base_url ?? '',
      apiKey: settings.ai_api_key && !settings.ai_api_key.includes('****') ? settings.ai_api_key : '',
      model: settings.ai_model ?? '',
    }
  }, [data])
  const form = draft ?? initialForm

  useEffect(() => {
    if (!feedback || feedback.tone !== 'success') {
      return
    }

    const timer = window.setTimeout(() => {
      setFeedback(null)
    }, 4000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [feedback])

  const persistSettings = async () => {
    const payload: Record<string, string> = {
      ai_provider: 'openai',
      ai_base_url: form.baseUrl.trim(),
      ai_model: form.model.trim(),
    }

    if (form.apiKey.trim() && !form.apiKey.includes('****')) {
      payload.ai_api_key = form.apiKey.trim()
    }

    await updateSettings.mutateAsync(payload)
  }

  const handleSave = async () => {
    setFeedback(null)

    try {
      await persistSettings()
      setFeedback({ tone: 'success', message: '设置已保存。' })
      return true
    } catch (saveError: unknown) {
      setFeedback({ tone: 'error', message: getErrorMessage(saveError, '保存设置失败') })
      return false
    }
  }

  const handleTest = async () => {
    const saved = await handleSave()
    if (!saved) {
      return
    }

    const result = await testAI.mutateAsync()
    setFeedback({ tone: result.ok ? 'success' : 'error', message: result.message })
  }

  const loadError = error instanceof Error ? error.message : null

  return (
    <div className="w-full space-y-6">
      <section className="surface-divider pb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="section-label">Settings</div>
            <h1 className="text-[18px] font-semibold leading-6 text-[var(--color-text)]">设置</h1>
            <p className="max-w-[760px] text-[13px] leading-5 text-[var(--color-text-secondary)]">
              在这里管理 AI 连接、界面主题和当前工作区的使用方式。页面会铺满右侧区域，但每个设置块内部仍保持舒适的阅读宽度。
            </p>
          </div>

          <Button leading={<Icon className="text-[14px]" name="arrow-left" />} onClick={() => navigate('/')} size="sm" variant="secondary">
            返回书签
          </Button>
        </div>
      </section>

      {feedback ? <NoticeBanner notice={feedback} onClose={() => setFeedback(null)} /> : null}

      {loadError && !feedback ? (
        <Surface className="px-4 py-3" tone="subtle">
          <p className="text-[13px] leading-5 text-[var(--color-danger)]">{loadError}</p>
        </Surface>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
        <Surface className="space-y-5 p-4 sm:p-5" tone="panel">
          <div className="space-y-2">
            <div className="section-label">AI Connection</div>
            <h2 className="text-[16px] font-semibold leading-6 text-[var(--color-text)]">模型连接</h2>
            <p className="max-w-[720px] text-[13px] leading-5 text-[var(--color-text-secondary)]">
              填写 API 地址、API Key 和模型名称。这里不再自动帮你写默认模型，保持为空时就按你的输入来保存。
            </p>
          </div>

          <div className="grid max-w-[720px] gap-4">
            <Input
              helper="支持官方 OpenAI 接口，也支持兼容 OpenAI 的自定义网关。"
              label="API 地址"
              onChange={(event) => setDraft((current) => ({ ...(current ?? initialForm), baseUrl: event.target.value }))}
              value={form.baseUrl}
            />

            <Input
              helper="如果后端返回的是脱敏密钥，这里可以留空，不会覆盖原来的值。"
              label="API Key"
              onChange={(event) => setDraft((current) => ({ ...(current ?? initialForm), apiKey: event.target.value }))}
              trailing={
                <button
                  aria-label={showKey ? '隐藏密钥' : '显示密钥'}
                  className="icon-button h-8 w-8"
                  onClick={() => setShowKey((current) => !current)}
                  type="button"
                >
                  <Icon className="text-[14px]" name={showKey ? 'eye-off' : 'eye'} />
                </button>
              }
              trailingInteractive
              type={showKey ? 'text' : 'password'}
              value={form.apiKey}
            />

            <Input
              helper="保持为空时不会自动填默认模型，由你自行决定后再保存。"
              label="模型名称"
              onChange={(event) => setDraft((current) => ({ ...(current ?? initialForm), model: event.target.value }))}
              value={form.model}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] pt-4">
            <Button
              disabled={isLoading || updateSettings.isPending || testAI.isPending}
              leading={<Icon className="text-[14px]" name="sparkles" />}
              onClick={() => void handleTest()}
              size="sm"
              variant="secondary"
            >
              {testAI.isPending ? '测试中…' : '测试连接'}
            </Button>
            <Button
              disabled={isLoading || updateSettings.isPending}
              leading={<Icon className="text-[14px]" name="check-circle" />}
              onClick={() => void handleSave()}
              size="sm"
              variant="primary"
            >
              {updateSettings.isPending ? '保存中…' : '保存设置'}
            </Button>
          </div>
        </Surface>

        <div className="grid gap-4 xl:grid-rows-[auto_auto]">
          <Surface className="space-y-4 p-4 sm:p-5" tone="panel">
            <div className="space-y-2">
              <div className="section-label">Appearance</div>
              <h2 className="text-[16px] font-semibold leading-6 text-[var(--color-text)]">主题模式</h2>
              <p className="max-w-[360px] text-[13px] leading-5 text-[var(--color-text-secondary)]">
                切换后会立即生效，并保持整站统一。
              </p>
            </div>

            <div className="grid gap-2 max-w-[420px]">
              <ThemeButton active={themeMode === 'system'} icon="monitor" label="跟随系统" onClick={() => setThemeMode('system')} />
              <ThemeButton active={themeMode === 'light'} icon="star" label="浅色模式" onClick={() => setThemeMode('light')} />
              <ThemeButton active={themeMode === 'dark'} icon="moon" label="深色模式" onClick={() => setThemeMode('dark')} />
            </div>
          </Surface>

          <Surface className="space-y-3 p-4 sm:p-5" tone="subtle">
            <div className="section-label">Notes</div>
            <ul className="max-w-[420px] space-y-2 text-[13px] leading-5 text-[var(--color-text-secondary)]">
              <li>测试连接会先保存当前表单，再调用后端的测试接口。</li>
              <li>没有填写密钥时，后端会明确告诉你缺了什么。</li>
              <li>这里不会动你的书签数据，只会更新当前设置。</li>
            </ul>
          </Surface>
        </div>
      </div>
    </div>
  )
}

function ThemeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: 'monitor' | 'moon' | 'star'
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={`flex items-center justify-between gap-3 rounded-[8px] border px-3 py-3 text-left transition-colors duration-200 ${
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-muted)]">
          <Icon className="text-[14px]" name={icon} />
        </span>
        <span className="text-[14px] font-medium">{label}</span>
      </span>
      <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'}`} />
    </button>
  )
}
