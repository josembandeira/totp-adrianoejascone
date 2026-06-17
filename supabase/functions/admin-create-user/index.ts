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
  password: string
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
  if (!payload.name || !payload.email || !payload.password || !payload.teamId) {
    return Response.json({ message: 'Dados incompletos' }, { status: 400, headers: corsHeaders })
  }
  if (payload.password.length < 6) {
    return Response.json(
      { message: 'A senha deve ter no mínimo 6 caracteres' },
      { status: 400, headers: corsHeaders },
    )
  }
  const role = payload.role === 'admin' ? 'admin' : 'member'

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { name: payload.name },
  })
  if (createError || !created.user) {
    return Response.json(
      { message: createError?.message ?? 'Não foi possível criar o usuário' },
      { status: 400, headers: corsHeaders },
    )
  }

  const { error: memberError } = await admin
    .from('team_members')
    .insert({ team_id: payload.teamId, user_id: created.user.id, role })
  if (memberError) {
    // Desfaz a criação do auth user para não deixar órfão
    await admin.auth.admin.deleteUser(created.user.id)
    return Response.json({ message: memberError.message }, { status: 400, headers: corsHeaders })
  }

  return Response.json(
    { id: created.user.id, email: created.user.email },
    { headers: corsHeaders },
  )
})
