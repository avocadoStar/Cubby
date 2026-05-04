import { useAuthStore } from './stores/authStore'
import LoginPage from './components/LoginPage'
import MainLayout from './components/MainLayout'

function isExpired(token: string | null): boolean {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
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
  return <MainLayout />
}
