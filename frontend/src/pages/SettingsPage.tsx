import { useEffect, useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

export function SettingsPage() {
  const { settings, fetchSettings, updateSettings, testAI } = useSettingsStore()
  const [provider, setProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => { fetchSettings() }, [])

  useEffect(() => {
    if (settings.ai_provider) setProvider(settings.ai_provider)
    if (settings.ai_model) setModel(settings.ai_model)
    if (settings.ai_base_url) setBaseUrl(settings.ai_base_url)
    if (settings.ai_api_key && settings.ai_api_key !== '') setApiKey(settings.ai_api_key)
  }, [settings])

  const handleSave = async () => {
    const data: Record<string, string> = { ai_provider: provider, ai_model: model }
    if (apiKey && !apiKey.includes('****')) data.ai_api_key = apiKey
    if (baseUrl) data.ai_base_url = baseUrl
    await updateSettings(data)
    alert('保存成功')
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testAI()
    setTestResult(result)
    setTesting(false)
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 px-7 py-4 border-b border-white/[0.06] bg-white/[0.02] flex-shrink-0">
        <span className="text-base">⚙️</span>
        <h1 className="text-lg font-bold tracking-tight">设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-7">
        <div className="max-w-lg space-y-6">
          <section>
            <h2 className="text-base font-semibold mb-4">AI 配置</h2>

            <label className="block mb-3">
              <span className="text-sm text-white/50 mb-1.5 block">AI 服务商</span>
              <select className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm outline-none"
                value={provider} onChange={e => setProvider(e.target.value)}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="custom">自定义</option>
              </select>
            </label>

            <label className="block mb-3">
              <span className="text-sm text-white/50 mb-1.5 block">API Key</span>
              <div className="flex gap-2">
                <input className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm outline-none focus:border-[#7C6AEF]/40"
                  type={showKey ? 'text' : 'password'}
                  placeholder="输入 API Key"
                  value={apiKey} onChange={e => setApiKey(e.target.value)} />
                <button className="px-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/50 hover:text-white/70"
                  onClick={() => setShowKey(!showKey)}>{showKey ? '隐藏' : '显示'}</button>
              </div>
            </label>

            <label className="block mb-3">
              <span className="text-sm text-white/50 mb-1.5 block">模型名称</span>
              <input className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm outline-none focus:border-[#7C6AEF]/40"
                placeholder={provider === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-4-20250514'}
                value={model} onChange={e => setModel(e.target.value)} />
            </label>

            <label className="block mb-3">
              <span className="text-sm text-white/50 mb-1.5 block">自定义 API 地址</span>
              <input className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm outline-none focus:border-[#7C6AEF]/40"
                placeholder="留空使用默认地址"
                value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
            </label>

            {testResult && (
              <div className={`text-sm py-2 px-4 rounded-xl mb-3 ${testResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {testResult.message}
              </div>
            )}

            <div className="flex gap-3">
              <button className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/60 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.09]"
                onClick={handleTest} disabled={testing}>
                {testing ? '测试中…' : '测试连接'}
              </button>
              <button className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7C6AEF, #5B4FCF)' }}
                onClick={handleSave}>保存</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
