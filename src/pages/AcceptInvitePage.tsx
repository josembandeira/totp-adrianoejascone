import { useState, useEffect } from 'react'
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
  publicKeyFromBase64,
  publicKeyToBase64,
  saltFromBase64,
} from '@/lib/crypto'
import { supabase } from '@/lib/supabase'
import type { Team, User } from '@/types'
import type { KeyPair } from '@/lib/crypto'

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Senha deve ter ao menos 8 caracteres')
      .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
      .regex(/[a-z]/, 'Senha deve conter ao menos uma letra minúscula')
      .regex(/[0-9]/, 'Senha deve conter ao menos um número')
      .regex(/[@#$%!&*]/, 'Senha deve conter ao menos um caractere especial (@#$%!&*)'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export function AcceptInvitePage() {
  const navigate = useNavigate()
  const { login, setMasterKey, setKeyPair } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    // Verifica a URL antes de qualquer coisa: se não há token de convite,
    // redireciona imediatamente sem esperar eventos do Supabase.
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const hasToken =
      params.has('token_hash') ||
      params.has('code') ||
      hashParams.has('access_token')

    if (!hasToken) {
      navigate('/login', { replace: true })
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: values.password })
      if (updateError) throw new Error(updateError.message)

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) throw new Error('Sessão inválida')
      const authUser = session.user

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
        keyPair = { publicKey: await publicKeyFromBase64(publicKeyBase64), privateKey }
      }

      const { data: memberships, error: membershipsError } = await supabase
        .from('team_members')
        .select('team_id, teams ( id, name, slug )')
        .eq('user_id', authUser.id)
      if (membershipsError) throw new Error('Não foi possível carregar suas equipes')

      const teams: Team[] = (memberships ?? [])
        .map((m) => m.teams)
        .filter((t): t is { id: string; name: string; slug: string } => Boolean(t))
        .map((t) => ({ id: t.id, name: t.name, slug: t.slug, memberCount: 0 }))

      const user: User = {
        id: authUser.id,
        email: authUser.email ?? '',
        name: profile.name,
        avatar: profile.avatar ?? undefined,
        teams,
        isSuperAdmin: profile.is_super_admin,
      }

      login(user, session.access_token)
      setMasterKey(masterKey)
      setKeyPair(keyPair)
      useServicesStore.getState().setActiveTeam(teams[0]?.id)
      toast.success('Conta criada com sucesso! Bem-vindo!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/50">
        <p className="text-sm text-muted-foreground">Validando convite...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">TOTP Teams</h1>
          <p className="text-sm text-muted-foreground">Crie sua senha para começar</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Criar senha</CardTitle>
            <CardDescription>Defina uma senha para acessar sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
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

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="pr-10"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Criando conta...' : 'Criar conta'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
