import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AnimatedBackground } from './components/AnimatedBackground'
import { Layout } from './components/Layout'
import { Button } from './components/ui/Button'
import { Input } from './components/ui/Input'
import { Modal } from './components/ui/Modal'
import { Surface } from './components/ui/Surface'
import { useThemeMode } from './hooks/useThemeMode'
import { MainPage } from './pages/MainPage'
import { SettingsPage } from './pages/SettingsPage'
import * as api from './services/api'
import { getErrorMessage } from './utils/errors'

type AuthState = 'authenticated' | 'checking' | 'unauthenticated'

export default function App() {
  const queryClient = useQueryClient()
  const { resolvedTheme } = useThemeMode()
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const resetToLogin = useCallback(
    (message = '') => {
      queryClient.clear()
      setPassword('')
      setSubmitting(false)
      setFeedback(message)
      setAuthState('unauthenticated')
    },
    [queryClient],
  )

  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      resetToLogin('登录已失效，请重新输入密码。')
    })

    return () => {
      api.setUnauthorizedHandler(null)
    }
  }, [queryClient, resetToLogin])

  useEffect(() => {
    let active = true

    const verifyAuthStatus = async () => {
      try {
        const response = await api.getAuthStatus()
        if (!active) {
          return
        }
        setFeedback('')
        setAuthState(response.authenticated ? 'authenticated' : 'unauthenticated')
      } catch (error: unknown) {
        if (!active) {
          return
        }
        resetToLogin(getErrorMessage(error, '无法验证登录状态，请稍后重试。'))
      }
    }

    void verifyAuthStatus()

    return () => {
      active = false
    }
  }, [resetToLogin])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setFeedback('')

    try {
      const response = await api.login(password)
      if (response.authenticated) {
        setPassword('')
        setAuthState('authenticated')
      } else {
        setFeedback('登录失败，请重试。')
      }
    } catch (error: unknown) {
      setFeedback(getErrorMessage(error, '登录失败，请重试。'))
      setAuthState('unauthenticated')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch {
      // Clearing local state still logs the user out from the UI.
    } finally {
      resetToLogin('')
    }
  }

  if (authState !== 'authenticated') {
    return (
      <div className="h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
        <AnimatedBackground theme={resolvedTheme} />

        <div className="relative z-10 flex h-full items-center justify-center px-4">
          <Surface className="w-full max-w-[24rem] px-5 py-6 text-center" tone="panel">
            <div className="space-y-2">
              <div className="text-[18px] font-semibold leading-6 text-[var(--color-text)]">Cubby</div>
              <p className="text-[13px] leading-5 text-[var(--color-text-secondary)]">
                {authState === 'checking' ? '正在验证登录状态…' : '请先输入访问密码后再继续使用。'}
              </p>
            </div>
          </Surface>
        </div>

        {authState === 'unauthenticated' ? (
          <Modal dismissible={false} onClose={() => undefined} open title="输入访问密码" width="md">
            <form className="space-y-4" onSubmit={handleLogin}>
              <Input
                autoComplete="current-password"
                autoFocus
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入部署密码"
                type="password"
                value={password}
              />

              {feedback ? <p className="text-[13px] leading-5 text-[var(--color-danger)]">{feedback}</p> : null}

              <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-4">
                <Button disabled={submitting || password.length === 0} type="submit" variant="primary">
                  {submitting ? '登录中…' : '进入 Cubby'}
                </Button>
              </div>
            </form>
          </Modal>
        ) : null}
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout onLogout={handleLogout} />}>
          <Route path="/" element={<MainPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
