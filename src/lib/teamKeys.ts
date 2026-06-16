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

// Garante que o usuário atual tenha acesso à chave da equipe, criando-a se
// for a primeira vez, e propaga o acesso a membros (e Super Admins) que
// ainda não têm um envelope (`wrapped_key`). Retorna null se a chave da
// equipe já existe mas o usuário atual ainda não foi autorizado por
// ninguém — nesse caso é preciso esperar um membro com acesso abrir esta
// tela para que a propagação aconteça.
export async function ensureTeamKeyAccess(teamId: string): Promise<Uint8Array | null> {
  const cached = cache.get(teamId)
  if (cached) return cached

  const { user, keyPair } = useAuthStore.getState()
  if (!user || !keyPair) return null

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
    if (someoneElseHasKey) {
      // A chave já existe, mas ninguém selou uma cópia para este usuário
      // ainda. É preciso aguardar um membro com acesso conceder.
      return null
    }
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
  await grantAccessToMissingMembers(teamId, teamKey)
  return teamKey
}

// Selará a chave da equipe para qualquer membro existente sem `wrapped_key`
// e adicionará Super Admins que ainda não fazem parte da equipe, desde que
// já tenham gerado seu par de chaves (feito no primeiro login deles).
async function grantAccessToMissingMembers(teamId: string, teamKey: Uint8Array): Promise<void> {
  const { data: members } = await supabase
    .from('team_members')
    .select('user_id, wrapped_key, profiles ( public_key )')
    .eq('team_id', teamId)

  for (const member of members ?? []) {
    if (member.wrapped_key || !member.profiles?.public_key) continue
    const wrapped = await sealForUser(teamKey, member.profiles.public_key)
    await supabase
      .from('team_members')
      .update({ wrapped_key: wrapped })
      .eq('team_id', teamId)
      .eq('user_id', member.user_id)
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

// Usado ao criar uma equipe nova: sela a chave recém-gerada para o criador.
export async function sealTeamKeyForCreator(
  teamKey: Uint8Array,
  creatorPublicKeyBase64: string,
): Promise<string> {
  return sealForUser(teamKey, creatorPublicKeyBase64)
}

// Selará a chave de uma equipe recém-criada para todos os Super Admins
// atuais (exceto o criador). Deve ser chamado só depois que a linha de
// `team_members` do criador já foi inserida, para satisfazer a RLS.
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
