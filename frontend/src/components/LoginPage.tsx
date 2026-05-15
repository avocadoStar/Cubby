import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import LoginSunnyBackground from './LoginSunnyBackground'

const ERROR_PERSIST_MS = 2500
const ERROR_FADE_IN_DELAY_MS = 200

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [shake, setShake] = useState(false)
  const [showInputError, setShowInputError] = useState(false)
  const [visibleError, setVisibleError] = useState<string | null>(null)
  const [showErrorText, setShowErrorText] = useState(false)
  const { login, loading, error } = useAuthStore()

  const errorSetAtRef = useRef(0)
  const fadeInTimerRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const clearFadeInTimer = () => {
    if (fadeInTimerRef.current !== null) {
      window.clearTimeout(fadeInTimerRef.current)
      fadeInTimerRef.current = null
    }
  }

  const clearShakeFrame = () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }

  const clearStoredError = () => {
    if (useAuthStore.getState().error) {
      useAuthStore.setState({ error: null })
    }
  }

  const clearVisibleError = () => {
    clearFadeInTimer()
    setVisibleError(null)
    setShowErrorText(false)
    errorSetAtRef.current = 0
    clearStoredError()
  }

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes login-shake {
        0%, 100% { transform: translateX(0) }
        20% { transform: translateX(-6px) }
        40% { transform: translateX(6px) }
        60% { transform: translateX(-4px) }
        80% { transform: translateX(4px) }
      }
    `
    document.head.appendChild(style)

    return () => {
      clearFadeInTimer()
      clearShakeFrame()
      if (style.parentNode) {
        style.parentNode.removeChild(style)
      }
    }
  }, [])

  useEffect(() => {
    if (!error) return

    errorSetAtRef.current = Date.now()
    setVisibleError(error)
    setShowInputError(true)
    setShowErrorText(false)

    clearFadeInTimer()
    fadeInTimerRef.current = window.setTimeout(() => {
      setShowErrorText(true)
      fadeInTimerRef.current = null
    }, ERROR_FADE_IN_DELAY_MS)

    clearShakeFrame()
    setShake(false)
    animationFrameRef.current = window.requestAnimationFrame(() => {
      setShake(true)
      animationFrameRef.current = null
    })
  }, [error])

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    setShowInputError(false)

    if (!visibleError) return

    const hasMetMinimumDuration = Date.now() - errorSetAtRef.current >= ERROR_PERSIST_MS
    if (hasMetMinimumDuration) {
      clearVisibleError()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!password || loading) return

    clearStoredError()
    await login(password)
  }

  return (
    <div
      className="login-sunny-page flex min-h-screen items-center justify-center px-4"
      style={{ background: '#f2efe9' }}
    >
      <LoginSunnyBackground />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex w-80 max-w-full flex-col gap-4 p-8 max-sm:mx-4 max-sm:p-6"
        style={{
          background: 'rgba(250, 247, 241, 0.88)',
          border: '1px solid rgba(216, 213, 207, 0.92)',
          borderRadius: 'var(--card-radius, 12px)',
          boxShadow: '0 18px 34px rgba(72, 56, 34, 0.13), 0 4px 10px rgba(72, 56, 34, 0.07)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <h1
          className="flex items-center justify-center gap-2 text-center text-2xl font-semibold"
          style={{ color: '#1a1a1a' }}
        >
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          Cubby
        </h1>
        <p className="text-center text-sm" style={{ color: '#66615b' }}>
          {'输入密码以访问收藏夹'}
        </p>
        <div
          className="flex flex-col gap-2"
          style={{ animation: shake ? 'login-shake 0.4s ease' : undefined }}
          onAnimationEnd={() => setShake(false)}
        >
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => handlePasswordChange(event.target.value)}
            placeholder={'密码'}
            autoComplete="current-password"
            autoFocus
            aria-invalid={showInputError}
            className="h-9 rounded px-3 text-sm outline-none"
            style={{
              border: showInputError ? '1px solid #B94B36' : '1px solid rgba(216, 213, 207, 0.92)',
              borderRadius: 'var(--input-radius, 8px)',
              boxShadow: showInputError
                ? 'inset 0 1px 2px rgba(72, 56, 34, 0.06), 0 0 0 3px rgba(185, 75, 54, 0.14)'
                : 'inset 0 1px 2px rgba(72, 56, 34, 0.06)',
              background: 'rgba(255, 252, 246, 0.92)',
              color: '#1a1a1a',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
          />
          <div aria-live="polite" className="min-h-5 overflow-hidden">
            <p
              className="text-sm"
              style={{
                color: '#B94B36',
                opacity: visibleError && showErrorText ? 1 : 0,
                transform: visibleError && showErrorText ? 'translateY(0)' : 'translateY(-4px)',
                transition: 'opacity 0.25s ease, transform 0.25s ease',
              }}
            >
              {visibleError || ' '}
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !password}
          className="h-9 rounded border-none text-sm font-medium transition-[opacity,filter,box-shadow] disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: '#8b7355',
            borderRadius: 'var(--btn-radius, 8px)',
            boxShadow: loading || !password
              ? 'inset 0 1px 2px rgba(72, 56, 34, 0.06)'
              : '0 2px 8px rgba(72, 56, 34, 0.16)',
            color: '#ffffff',
            filter: loading || !password ? 'saturate(0.85)' : 'none',
          }}
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  )
}
