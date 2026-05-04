import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const { login, loading, error } = useAuthStore()

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <form
        onSubmit={(e) => { e.preventDefault(); login(password) }}
        className="w-80 p-8 flex flex-col gap-4"
      >
        <h1 className="text-2xl font-semibold text-center text-[#1a1a1a] flex items-center justify-center gap-2">
          <img src="/favicon.svg" alt="" className="w-7 h-7" />
          Cubby
        </h1>
        <p className="text-sm text-center text-[#666]">输入密码以访问收藏夹</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          autoFocus
          className="h-9 px-3 border border-[#d1d1d1] rounded text-sm outline-none focus:border-[#0078D4]"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="h-9 bg-[#0078D4] text-white rounded text-sm font-medium disabled:opacity-50"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  )
}
