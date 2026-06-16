// Cria uma conta de usuário nova e a associa a uma equipe. Só pode ser
// chamada por um Super Administrador. Precisa da service role key porque a
// Admin API do Supabase (criação de usuários) nunca pode ser exposta ao
// cliente.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Payload {
  name: string
  email: string
  teamId: string
  role?: 'admin' | 'member'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return Response.json({ message: 'Não autenticado' }, { status: 401, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const callerClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: callerData, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !callerData.user) {
    return Response.json({ message: 'Não autenticado' }, { status: 401, headers: corsHeaders })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('is_super_admin')
    .eq('id', callerData.user.id)
    .single()

  if (!callerProfile?.is_super_admin) {
    return Response.json(
      { message: 'Apenas Super Administradores podem criar usuários' },
      { status: 403, headers: corsHeaders },
    )
  }

  const payload = (await req.json()) as Payload
  if (!payload.name || !payload.email || !payload.teamId) {
    return Response.json({ message: 'Dados incompletos' }, { status: 400, headers: corsHeaders })
  }
  const role = payload.role === 'admin' ? 'admin' : 'member'

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    payload.email,
    { data: { name: payload.name } },
  )
  if (inviteError || !invited.user) {
    return Response.json(
      { message: inviteError?.message ?? 'Não foi possível convidar o usuário' },
      { status: 400, headers: corsHeaders },
    )
  }

  const { error: memberError } = await admin
    .from('team_members')
    .insert({ team_id: payload.teamId, user_id: invited.user.id, role })
  if (memberError) {
    return Response.json({ message: memberError.message }, { status: 400, headers: corsHeaders })
  }

  return Response.json(
    { id: invited.user.id, email: invited.user.email },
    { headers: corsHeaders },
  )
})
