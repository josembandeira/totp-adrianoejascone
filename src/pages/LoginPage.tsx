import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth'
import { useServicesStore } from '@/store/services'
import {
  decryptPrivateKey,
  deriveKey,
  encryptPrivateKey,
  generateKeyPair,
  generateSalt,
  generateTeamKey,
  publicKeyFromBase64,
  publicKeyToBase64,
  saltFromBase64,
} from '@/lib/crypto'
import { sealNewTeamKeyForSuperAdmins, sealTeamKeyForCreator } from '@/lib/teamKeys'
import { supabase } from '@/lib/supabase'
import type { Team, User } from '@/types'
import type { KeyPair } from '@/lib/crypto'

const schema = z.object({
  email: z.email('E-mail inválido').min(1, 'E-mail obrigatório'),
  password: z
    .string()
    .min(8, 'Senha deve ter ao menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter ao menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter ao menos um número')
    .regex(/[@#$%!&*]/, 'Senha deve conter ao menos um caractere especial (@#$%!&*)'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { login, setMasterKey, setKeyPair } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })
      if (authError || !authData.user) throw new Error('E-mail ou senha inválidos')
      const authUser = authData.user

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, avatar, kdf_salt, is_super_admin, public_key, encrypted_private_key')
        .eq('id', authUser.id)
        .single()
      if (profileError || !profile) throw new Error('Perfil não encontrado')

      let kdfSalt = profile.kdf_salt
      if (!kdfSalt) {
        kdfSalt = await generateSalt()
        await supabase.from('profiles').update({ kdf_salt: kdfSalt }).eq('id', authUser.id)
      }

      const salt = await saltFromBase64(kdfSalt)
      const masterKey = await deriveKey(values.password, salt)

      let keyPair: KeyPair
      let publicKeyBase64: string
      if (!profile.public_key || !profile.encrypted_private_key) {
        const pair = await generateKeyPair()
        publicKeyBase64 = await publicKeyToBase64(pair.publicKey)
        const encryptedPrivateKey = await encryptPrivateKey(pair.privateKey, masterKey)
        await supabase
          .from('profiles')
          .update({ public_key: publicKeyBase64, encrypted_private_key: encryptedPrivateKey })
          .eq('id', authUser.id)
        keyPair = pair
      } else {
        publicKeyBase64 = profile.public_key
        const privateKey = await decryptPrivateKey(profile.encrypted_private_key, masterKey)
        keyPair = { publicKey: await publicKeyFromBase64(profile.public_key), privateKey }
      }

      const { data: memberships, error: membershipsError } = await supabase
        .from('team_members')
        .select('team_id, teams ( id, name, slug )')
        .eq('user_id', authUser.id)
      if (membershipsError) throw new Error('Não foi possível carregar suas equipes')

      let teams: Team[] = (memberships ?? [])
        .map((m) => m.teams)
        .filter((t): t is { id: string; name: string; slug: string } => Boolean(t))
        .map((t) => ({ id: t.id, name: t.name, slug: t.slug, memberCount: 0 }))

      if (teams.length === 0) {
        const slug = `equipe-${authUser.id.slice(0, 8)}`
        const teamKey = await generateTeamKey()
        const keyMaterial = await publicKeyToBase64(teamKey)
        const wrappedKey = await sealTeamKeyForCreator(teamKey, publicKeyBase64)
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .insert({ name: `Equipe de ${profile.name}`, slug, key_material: keyMaterial })
          .select('id, name, slug')
          .single()
        if (teamError || !team) throw new Error('Não foi possível criar a equipe')
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({ team_id: team.id, user_id: authUser.id, role: 'admin', wrapped_key: wrappedKey })
        if (memberError) throw new Error('Não foi possível associar você à equipe')

        const superAdminEntries = await sealNewTeamKeyForSuperAdmins(teamKey, authUser.id)
        for (const entry of superAdminEntries) {
          await supabase.from('team_members').insert({
            team_id: team.id,
            user_id: entry.userId,
            role: entry.role,
            wrapped_key: entry.wrappedKey,
          })
        }

        teams = [{ id: team.id, name: team.name, slug: team.slug, memberCount: 1 }]
      }

      const user: User = {
        id: authUser.id,
        email: authUser.email ?? values.email,
        name: profile.name,
        avatar: profile.avatar ?? undefined,
        teams,
        isSuperAdmin: profile.is_super_admin,
      }

      login(user, authData.session?.access_token ?? '')
      setMasterKey(masterKey)
      setKeyPair(keyPair)
      useServicesStore.getState().setActiveTeam(teams[0].id)
      toast.success('Login realizado com sucesso!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha no login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">TOTP Teams</h1>
          <p className="text-sm text-muted-foreground">Códigos seguros para sua equipe</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Entrar</CardTitle>
            <CardDescription>Acesse sua conta para ver os códigos</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite seu e-mail"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
