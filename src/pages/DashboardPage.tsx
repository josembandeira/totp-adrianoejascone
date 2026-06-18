import { useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { TOTPCard } from '@/components/totp/TOTPCard'
import { AddServiceModal } from '@/components/totp/AddServiceModal'
import { useServicesStore } from '@/store/services'
import { useAuthStore } from '@/store/auth'
import type { ServiceFormData } from '@/types'
import type { DashboardOutletContext } from './DashboardLayout'

export function DashboardPage() {
  const { onMenuToggle } = useOutletContext<DashboardOutletContext>()
  const {
    services,
    decryptedSeeds,
    search,
    activeTeamId,
    loading,
    keyAccessDenied,
    loadServices,
    addService,
    removeService,
  } = useServicesStore()
  const { user } = useAuthStore()

  useEffect(() => {
    if (activeTeamId) loadServices(activeTeamId)
  }, [activeTeamId, loadServices])

  const filtered = useMemo(
    () =>
      services.filter(
        (s) =>
          (!activeTeamId || s.teamId === activeTeamId) &&
          (s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.accountName.toLowerCase().includes(search.toLowerCase()) ||
            s.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))),
      ),
    [services, search, activeTeamId],
  )

  const handleAdd = async (data: ServiceFormData) => {
    if (!activeTeamId || !user) return
    try {
      await addService(activeTeamId, data, user.id)
      toast.success(`${data.name} adicionado com sucesso`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível adicionar o serviço')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await removeService(id)
      toast.success('Serviço removido')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível remover o serviço')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Dashboard"
        subtitle={`${filtered.length} serviços ativos`}
        actions={<AddServiceModal onAdd={handleAdd} />}
        onMenuToggle={onMenuToggle}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {!loading && keyAccessDenied ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <p className="text-lg font-medium">Acesso pendente</p>
            <p className="text-sm text-center max-w-sm">
              Esta equipe ainda não foi migrada para o novo sistema de chaves. Um administrador
              precisa abrir o dashboard uma vez para liberar o acesso.
            </p>
            <button
              className="text-sm text-primary underline underline-offset-2"
              onClick={() => activeTeamId && loadServices(activeTeamId)}
            >
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <p className="text-lg font-medium">Nenhum serviço encontrado</p>
            <p className="text-sm">
              {search ? 'Tente outro termo de busca' : 'Adicione seu primeiro serviço TOTP'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((service) => (
              <TOTPCard
                key={service.id}
                service={service}
                decryptedSeed={decryptedSeeds[service.id] ?? ''}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
