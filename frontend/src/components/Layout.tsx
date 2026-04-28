import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { AnimatedBackground } from './AnimatedBackground'

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden relative">
      <AnimatedBackground />
      <Sidebar />
      <main className="flex-1 overflow-hidden relative z-10">
        <Outlet />
      </main>
    </div>
  )
}
