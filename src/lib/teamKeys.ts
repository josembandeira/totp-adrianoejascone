import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import {
  generateTeamKey,
  openSealedKey,
  publicKeyFromBase64,
  publicKeyToBase64,
  sealForMember,
} from '@/lib/crypto'

const cache = new Map<string, Uint8Array>()

export function getCachedTeamKey(teamId: string): Uint8Array | null {
  return cache.get(teamId) ?? null
}

async function sealForUser(teamKey: Uint8Array, publicKeyBase64: string): Promise<string> {
  const publicKey = await publicKeyFromBase64(publicKeyBase64)
  return sealForMember(teamKey, publicKey)
}

export async function ensureTeamKeyAccess(teamId: string): Promise<Uint8Array | null> {
  const cached = cache.get(teamId)
  if (cached) return cached

  const { user, keyPair } = useAuthStore.getState()
  if (!user || !keyPair) return null

  // Caminho primário: lê key_material diretamente da equipe via join.
  // Qualquer membro autenticado acessa sem precisar que um admin propague.
  const { data: membership } = await supabase
    .from('team_members')
    .select('teams ( key_material )')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (membership?.teams?.key_material) {
    const teamKey = await publicKeyFromBase64(membership.teams.key_material)
    cache.set(teamId, teamKey)
    grantAccessToMissingMembers(teamId, teamKey)
    return teamKey
  }

  // Fallback: wrapped_key para equipes criadas antes da migração key_material
  const { data: rows, error } = await supabase
    .from('team_members')
    .select('user_id, wrapped_key')
    .eq('team_id', teamId)
  if (error || !rows) return null

  const ownRow = rows.find((r) => r.user_id === user.id)
  let teamKey: Uint8Array | null = null

  if (ownRow?.wrapped_key) {
    teamKey = await openSealedKey(ownRow.wrapped_key, keyPair)
  } else {
    const someoneElseHasKey = rows.some((r) => r.user_id !== user.id && r.wrapped_key)
    if (someoneElseHasKey) return null
    if (!ownRow) return null
    teamKey = await generateTeamKey()
    const wrapped = await sealForUser(teamKey, await publicKeyToBase64(keyPair.publicKey))
    const { error: updateError } = await supabase
      .from('team_members')
      .update({ wrapped_key: wrapped })
      .eq('team_id', teamId)
      .eq('user_id', user.id)
    if (updateError) return null
  }

  cache.set(teamId, teamKey)

  // Migração automática: persiste key_material para que membros futuros não precisem de propagação.
  // Pode falhar silenciosamente se o usuário não tiver permissão de UPDATE na tabela teams.
  const keyMaterial = await publicKeyToBase64(teamKey)
  await supabase.from('teams').update({ key_material: keyMaterial }).eq('id', teamId)

  await grantAccessToMissingMembers(teamId, teamKey)
  return teamKey
}

export async function grantAccessToMissingMembers(teamId: string, teamKey: Uint8Array): Promise<void> {
  const { data: members } = await supabase
    .from('team_members')
    .select('user_id, wrapped_key, profiles ( public_key )')
    .eq('team_id', teamId)

  for (const member of members ?? []) {
    if (member.wrapped_key || !member.profiles?.public_key) continue
    const wrapped = await sealForUser(teamKey, member.profiles.public_key)
    const { error } = await supabase
      .from('team_members')
      .update({ wrapped_key: wrapped })
      .eq('team_id', teamId)
      .eq('user_id', member.user_id)
    if (error) console.error('[teamKeys] falha ao selar chave para membro', member.user_id, error)
  }

  const memberIds = new Set((members ?? []).map((m) => m.user_id))
  const { data: superAdmins } = await supabase
    .from('profiles')
    .select('id, public_key')
    .eq('is_super_admin', true)

  for (const admin of superAdmins ?? []) {
    if (memberIds.has(admin.id) || !admin.public_key) continue
    const wrapped = await sealForUser(teamKey, admin.public_key)
    await supabase.from('team_members').insert({
      team_id: teamId,
      user_id: admin.id,
      role: 'admin',
      wrapped_key: wrapped,
    })
  }
}

export async function sealTeamKeyForCreator(
  teamKey: Uint8Array,
  creatorPublicKeyBase64: string,
): Promise<string> {
  return sealForUser(teamKey, creatorPublicKeyBase64)
}

export async function sealNewTeamKeyForSuperAdmins(
  teamKey: Uint8Array,
  creatorId: string,
): Promise<{ userId: string; wrappedKey: string; role: 'admin' }[]> {
  const { data: superAdmins } = await supabase
    .from('profiles')
    .select('id, public_key')
    .eq('is_super_admin', true)

  const entries: { userId: string; wrappedKey: string; role: 'admin' }[] = []
  for (const admin of superAdmins ?? []) {
    if (admin.id === creatorId || !admin.public_key) continue
    entries.push({
      userId: admin.id,
      wrappedKey: await sealForUser(teamKey, admin.public_key),
      role: 'admin',
    })
  }
  return entries
}
