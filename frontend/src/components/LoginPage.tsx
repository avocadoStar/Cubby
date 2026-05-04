import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const { login, loading, error } = useAuthStore()

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--app-bg)' }}>
      <form
        onSubmit={(e) => { e.preventDefault(); login(password) }}
        className="w-80 p-8 flex flex-col gap-4"
      >
        <h1 className="text-2xl font-semibold text-center flex items-center justify-center gap-2" style={{ color: 'var(--app-text)' }}>
          <img src="/favicon.svg" alt="" className="w-7 h-7" />
          Cubby
        </h1>
        <p className="text-sm text-center" style={{ color: 'var(--app-text2)' }}>输入密码以访问收藏夹</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          autoFocus
          className="h-9 px-3 rounded text-sm outline-none"
          style={{
            border: 'var(--input-border)',
            boxShadow: 'var(--input-shadow)',
            background: 'var(--input-bg)',
            color: 'var(--app-text)',
          }}
        />
        {error && <p className="text-sm" style={{ color: 'var(--app-danger)' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="h-9 text-white rounded text-sm font-medium disabled:opacity-50 border-none cursor-default"
          style={{ background: 'var(--app-accent)' }}
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  )
}
