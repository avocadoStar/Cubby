import { useAuthStore } from './stores/authStore'
import LoginPage from './components/LoginPage'
import MainLayout from './components/MainLayout'
import ErrorBoundary from './components/ErrorBoundary'

function b64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
}

function isExpired(token: string | null): boolean {
  if (!token) return true
  try {
    const payload = JSON.parse(b64urlDecode(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export default function App() {
  const token = useAuthStore((s) => s.token)
  if (!token || isExpired(token)) {
    if (token) localStorage.removeItem('token')
    return <LoginPage />
  }
  return <ErrorBoundary><MainLayout /></ErrorBoundary>
}
