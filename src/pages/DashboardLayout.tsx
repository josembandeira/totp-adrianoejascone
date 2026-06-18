import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/store/auth'
import { useServicesStore } from '@/store/services'

export type DashboardOutletContext = {
  onMenuToggle: () => void
}

export function DashboardLayout() {
  const navigate = useNavigate()
  const { token, user } = useAuthStore()
  const { activeTeamId, setActiveTeam } = useServicesStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  useEffect(() => {
    if (!activeTeamId && user?.teams?.length) setActiveTeam(user.teams[0].id)
  }, [user, activeTeamId, setActiveTeam])

  if (!token) return null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Outlet context={{ onMenuToggle: () => setSidebarOpen((v) => !v) }} />
      </main>
    </div>
  )
}
