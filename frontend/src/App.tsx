import { useAuthStore } from './stores/authStore'
import LoginPage from './components/LoginPage'
import MainLayout from './components/MainLayout'

export default function App() {
  const token = useAuthStore((s) => s.token)
  if (!token) {
    return <LoginPage />
  }
  return <MainLayout />
}
