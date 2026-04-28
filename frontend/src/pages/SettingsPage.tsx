import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../stores/settingsStore'

export function SettingsPage() {
  const navigate = useNavigate()
  const { settings, fetchSettings, updateSettings, testAI } = useSettingsStore()
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => { fetchSettings() }, [])

  useEffect(() => {
    if (settings.ai_model) setModel(settings.ai_model)
    if (settings.ai_api_key && settings.ai_api_key !== '') setApiKey(settings.ai_api_key)
  }, [settings])

  const handleSave = async () => {
    const data: Record<string, string> = {
      ai_provider: 'dashscope',
      ai_base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      ai_model: model || 'qwen3.6-plus',
    }
    if (apiKey && !apiKey.includes('****')) data.ai_api_key = apiKey
    await updateSettings(data)
    alert('保存成功')
  }

  const handleTest = async () => {
    // 先保存再测试
    await handleSave()
    setTesting(true)
    setTestResult(null)
    const result = await testAI()
    setTestResult(result)
    setTesting(false)
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 px-7 py-4 border-b border-white/[0.06] bg-white/[0.02] flex-shrink-0">
        <button className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors"
          onClick={() => navigate('/')}>
          <span className="text-sm">←</span>
          <span className="text-sm">返回</span>
        </button>
        <span className="text-base">⚙️</span>
        <h1 className="text-lg font-bold tracking-tight text-white">设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-7">
        <div className="max-w-lg space-y-6">
          <section>
            <h2 className="text-base font-semibold mb-4 text-white">AI 配置（阿里云百炼）</h2>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
              <p className="text-sm text-white/40">
                使用阿里云百炼平台提供的通义千问模型。前往
                <a href="https://dashscope.console.aliyun.com/" target="_blank" rel="noopener noreferrer"
                  className="text-[#7C6AEF] hover:underline mx-1">百炼控制台</a>
                获取 API Key。
              </p>
            </div>

            <label className="block mb-3">
              <span className="text-sm text-white/50 mb-1.5 block">API Key</span>
              <div className="flex gap-2">
                <input className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm outline-none focus:border-[#7C6AEF]/40"
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-xxxxxxxx"
                  value={apiKey} onChange={e => setApiKey(e.target.value)} />
                <button className="px-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/50 hover:text-white/70"
                  onClick={() => setShowKey(!showKey)}>{showKey ? '隐藏' : '显示'}</button>
              </div>
            </label>

            <label className="block mb-3">
              <span className="text-sm text-white/50 mb-1.5 block">模型名称</span>
              <select className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm outline-none mb-2"
                value={model === 'qwen-plus' || model === 'qwen-turbo' ? model : (model || 'qwen3.6-plus')}
                onChange={e => setModel(e.target.value)}>
                <option value="qwen3.6-plus">Qwen3.6-Plus（推荐）</option>
                <option value="qwen-plus">Qwen-Plus</option>
                <option value="qwen-turbo">Qwen-Turbo（快速）</option>
                <option value="custom">自定义…</option>
              </select>
              {model !== 'qwen3.6-plus' && model !== 'qwen-plus' && model !== 'qwen-turbo' && (
                <input className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm outline-none focus:border-[#7C6AEF]/40"
                  placeholder="输入自定义模型名称" value={model} onChange={e => setModel(e.target.value)} />
              )}
            </label>

            <label className="block mb-4">
              <span className="text-sm text-white/50 mb-1.5 block">API 地址</span>
              <input className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/40 text-sm outline-none"
                value="https://dashscope.aliyuncs.com/compatible-mode/v1" readOnly />
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
