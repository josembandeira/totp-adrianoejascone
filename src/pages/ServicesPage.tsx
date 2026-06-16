import { useEffect, useMemo } from 'react'
import { Shield } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { AddServiceModal } from '@/components/totp/AddServiceModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useServicesStore } from '@/store/services'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'
import type { ServiceFormData } from '@/types'

const SERVICE_COLORS: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  purple: 'from-purple-500 to-purple-600',
  green: 'from-emerald-500 to-emerald-600',
  red: 'from-red-500 to-red-600',
  orange: 'from-orange-500 to-orange-600',
  pink: 'from-pink-500 to-pink-600',
}

export function ServicesPage() {
  const { services, search, activeTeamId, loadServices, addService, removeService } = useServicesStore()
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
            s.accountName.toLowerCase().includes(search.toLowerCase())),
      ),
    [services, search, activeTeamId],
  )

  const handleAdd = async (data: ServiceFormData) => {
    if (!activeTeamId || !user) return
    try {
      await addService(activeTeamId, data, user.id)
      toast.success(`${data.name} adicionado`)
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
        title="Serviços"
        subtitle="Gerencie os serviços TOTP da equipe"
        actions={<AddServiceModal onAdd={handleAdd} />}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Serviço</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conta</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tags</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Adicionado</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((svc) => (
                <tr key={svc.id} className="bg-card hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${
                          SERVICE_COLORS[svc.color ?? 'blue']
                        } text-white text-xs font-bold`}
                      >
                        {svc.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">{svc.issuer}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{svc.accountName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {svc.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(svc.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(svc.id)}
                    >
                      Remover
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Shield className="h-8 w-8" />
              <p className="font-medium">Nenhum serviço cadastrado</p>
              <p className="text-xs">Use o botão acima para adicionar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
