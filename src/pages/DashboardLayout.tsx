import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/store/auth'
import { useServicesStore } from '@/store/services'

export function DashboardLayout() {
  const navigate = useNavigate()
  const { token, user } = useAuthStore()
  const { activeTeamId, setActiveTeam } = useServicesStore()

  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  useEffect(() => {
    if (!activeTeamId && user?.teams?.length) setActiveTeam(user.teams[0].id)
  }, [user, activeTeamId, setActiveTeam])

  if (!token) return null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
