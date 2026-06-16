import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Shield, Key, Bell, Palette, UserPlus, ShieldCheck } from 'lucide-react'
import type { Team } from '@/types'

const selectClassName =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

function SuperAdminSection() {
  const [teams, setTeams] = useState<Team[]>([])

  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newTeamId, setNewTeamId] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member')
  const [creating, setCreating] = useState(false)

  const [assignEmail, setAssignEmail] = useState('')
  const [assignTeamId, setAssignTeamId] = useState('')
  const [assignRole, setAssignRole] = useState<'admin' | 'member'>('member')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    supabase
      .from('teams')
      .select('id, name, slug')
      .order('name')
      .then(({ data }) => {
        const loaded = (data ?? []).map((t) => ({ ...t, memberCount: 0 }))
        setTeams(loaded)
        setNewTeamId((id) => id || loaded[0]?.id || '')
        setAssignTeamId((id) => id || loaded[0]?.id || '')
      })
  }, [])

  const handleCreateUser = async () => {
    if (!newName || !newEmail || !newTeamId) return
    setCreating(true)
    const { error } = await supabase.functions.invoke('admin-create-user', {
      body: { name: newName, email: newEmail, teamId: newTeamId, role: newRole },
    })
    setCreating(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`Convite enviado para ${newEmail}`)
    setNewName('')
    setNewEmail('')
  }

  const handleAssign = async () => {
    if (!assignEmail || !assignTeamId) return
    setAssigning(true)
    const { error } = await supabase.rpc('add_team_member', {
      p_team_id: assignTeamId,
      p_email: assignEmail,
      p_role: assignRole,
    })
    setAssigning(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`${assignEmail} atribuído à equipe`)
    setAssignEmail('')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Administração
        </CardTitle>
        <CardDescription>Disponível apenas para Super Administradores</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="h-3.5 w-3.5" />
            Criar novo usuário
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="pessoa@empresa.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Equipe</Label>
              <select className={selectClassName} value={newTeamId} onChange={(e) => setNewTeamId(e.target.value)}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Papel</Label>
              <select
                className={selectClassName}
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'admin' | 'member')}
              >
                <option value="member">Membro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <Button onClick={handleCreateUser} disabled={creating || !newName || !newEmail || !newTeamId}>
            {creating ? 'Enviando convite...' : 'Criar usuário e convidar'}
          </Button>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium">Atribuir usuário existente a uma equipe</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={assignEmail}
                onChange={(e) => setAssignEmail(e.target.value)}
                placeholder="pessoa@empresa.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Equipe</Label>
              <select
                className={selectClassName}
                value={assignTeamId}
                onChange={(e) => setAssignTeamId(e.target.value)}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Papel</Label>
              <select
                className={selectClassName}
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value as 'admin' | 'member')}
              >
                <option value="member">Membro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <Button onClick={handleAssign} disabled={assigning || !assignEmail || !assignTeamId}>
            {assigning ? 'Atribuindo...' : 'Atribuir à equipe'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function SettingsPage() {
  const { user } = useAuthStore()
  const [name, setName] = useState(user?.name ?? '')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Configurações" subtitle="Gerencie sua conta e preferências" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Perfil
              </CardTitle>
              <CardDescription>Informações básicas da sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={user?.email ?? ''} disabled className="opacity-60" />
              </div>
              <Button onClick={() => toast.success('Perfil atualizado')}>Salvar alterações</Button>
            </CardContent>
          </Card>

          {user?.isSuperAdmin && <SuperAdminSection />}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Segurança
              </CardTitle>
              <CardDescription>Configurações de segurança e criptografia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Criptografia client-side</p>
                  <p className="text-xs text-muted-foreground">
                    Seeds encriptados com libsodium antes de sair do browser
                  </p>
                </div>
                <Badge className="bg-emerald-500 hover:bg-emerald-600">Ativa</Badge>
              </div>
              <Separator />
              <Button variant="outline" onClick={() => toast.info('Email de redefinição enviado')}>
                <Key className="h-4 w-4 mr-2" />
                Redefinir senha
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notificações
              </CardTitle>
              <CardDescription>Em breve</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configurações de notificações serão adicionadas em breve.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
