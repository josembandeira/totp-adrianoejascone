import { useEffect, useState } from 'react'
import { Users, Plus, Crown, ShieldCheck } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useServicesStore } from '@/store/services'
import { ensureTeamKeyAccess } from '@/lib/teamKeys'
import type { Team } from '@/types'

interface Member {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  isSuperAdmin: boolean
}

export function TeamsPage() {
  const { user } = useAuthStore()
  const { activeTeamId } = useServicesStore()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [viewTeamId, setViewTeamId] = useState<string | null>(null)

  const isSuperAdmin = Boolean(user?.isSuperAdmin)
  const teamOptions = isSuperAdmin ? allTeams : user?.teams ?? []
  const viewTeam = teamOptions.find((t) => t.id === viewTeamId) ?? teamOptions[0]

  useEffect(() => {
    if (!isSuperAdmin) return
    supabase
      .from('teams')
      .select('id, name, slug')
      .order('name')
      .then(({ data }) => {
        setAllTeams((data ?? []).map((t) => ({ ...t, memberCount: 0 })))
      })
  }, [isSuperAdmin])

  useEffect(() => {
    if (activeTeamId && !viewTeamId) setViewTeamId(activeTeamId)
  }, [activeTeamId, viewTeamId])

  const loadMembers = async (teamId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('team_members')
      .select('user_id, role, profiles ( name, email, is_super_admin )')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('Não foi possível carregar os membros da equipe')
      setLoading(false)
      return
    }

    setMembers(
      (data ?? []).flatMap((m) =>
        m.profiles
          ? [
              {
                id: m.user_id,
                name: m.profiles.name,
                email: m.profiles.email ?? '',
                role: m.role as 'admin' | 'member',
                isSuperAdmin: m.profiles.is_super_admin,
              },
            ]
          : [],
      ),
    )
    setLoading(false)
  }

  useEffect(() => {
    if (viewTeam) loadMembers(viewTeam.id)
  }, [viewTeam?.id])

  const isAdmin = isSuperAdmin || members.some((m) => m.id === user?.id && m.role === 'admin')
  const adminCount = members.filter((m) => m.role === 'admin').length

  const handleInvite = async () => {
    if (!inviteEmail || !viewTeam) return
    setInviting(true)
    const { error } = await supabase.rpc('add_team_member', {
      p_team_id: viewTeam.id,
      p_email: inviteEmail,
    })
    setInviting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`${inviteEmail} adicionado à equipe`)
    setInviteEmail('')
    setInviteOpen(false)
    await ensureTeamKeyAccess(viewTeam.id)
    loadMembers(viewTeam.id)
  }

  const handleRemove = async (member: Member) => {
    if (!viewTeam) return
    if (member.role === 'admin' && adminCount <= 1) {
      toast.error('A equipe precisa de ao menos um administrador')
      return
    }
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', viewTeam.id)
      .eq('user_id', member.id)
    if (error) {
      toast.error('Não foi possível remover o membro')
      return
    }
    setMembers((m) => m.filter((mb) => mb.id !== member.id))
    toast.success('Membro removido da equipe')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Equipes"
        subtitle={viewTeam ? `Gerencie os membros de ${viewTeam.name}` : 'Gerencie os membros da sua equipe'}
        actions={
          isAdmin && (
            <Button className="gap-2" onClick={() => setInviteOpen(true)} disabled={!viewTeam}>
              <Plus className="h-4 w-4" />
              Adicionar membro
            </Button>
          )
        }
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="colega@empresa.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
              <p className="text-xs text-muted-foreground">
                A pessoa precisa já ter uma conta para ser adicionada.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
                {inviting ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-4">
          {isSuperAdmin && teamOptions.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-2' })}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {viewTeam ? viewTeam.name : 'Selecionar equipe'}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {teamOptions.map((team) => (
                  <DropdownMenuItem key={team.id} onClick={() => setViewTeamId(team.id)}>
                    {team.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!viewTeam ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
              <p className="text-lg font-medium">Você não está em nenhuma equipe</p>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{viewTeam.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {loading ? 'Carregando...' : `${members.length} membros`}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium">{member.name}</p>
                          {member.role === 'admin' && <Crown className="h-3 w-3 text-amber-500" />}
                          {member.isSuperAdmin && <ShieldCheck className="h-3 w-3 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.isSuperAdmin && (
                        <Badge variant="outline" className="text-xs">
                          Super Admin
                        </Badge>
                      )}
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                        {member.role === 'admin' ? 'Admin' : 'Membro'}
                      </Badge>
                      {isAdmin && member.id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(member)}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
