import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { decryptSeed, encryptSeed } from '@/lib/crypto'
import { ensureTeamKeyAccess, getCachedTeamKey } from '@/lib/teamKeys'
import type { ServiceFormData, TOTPService } from '@/types'
import type { Database } from '@/types/database'

type ServiceRow = Database['public']['Tables']['services']['Row']

function mapRow(row: ServiceRow): TOTPService {
  return {
    id: row.id,
    name: row.name,
    issuer: row.issuer,
    accountName: row.account_name,
    encryptedSeed: row.encrypted_seed,
    icon: row.icon ?? undefined,
    color: row.color ?? undefined,
    teamId: row.team_id,
    addedBy: row.added_by,
    createdAt: row.created_at,
    tags: row.tags,
  }
}

export type ServiceUpdateData = {
  name: string
  issuer: string
  accountName: string
  seed?: string
  color?: string
  tags?: string[]
}

interface ServicesStore {
  services: TOTPService[]
  decryptedSeeds: Record<string, string>
  activeTeamId: string | null
  search: string
  loading: boolean
  keyAccessDenied: boolean
  loadServices: (teamId: string) => Promise<void>
  addService: (teamId: string, data: ServiceFormData, addedBy: string) => Promise<void>
  updateService: (id: string, data: ServiceUpdateData) => Promise<void>
  removeService: (id: string) => Promise<void>
  setActiveTeam: (teamId: string) => void
  setSearch: (search: string) => void
}

export const useServicesStore = create<ServicesStore>((set, get) => ({
  services: [],
  decryptedSeeds: {},
  activeTeamId: null,
  search: '',
  loading: false,
  keyAccessDenied: false,

  loadServices: async (teamId) => {
    set({ loading: true, keyAccessDenied: false })
    const teamKey = (await ensureTeamKeyAccess(teamId)) ?? getCachedTeamKey(teamId)
    if (!teamKey) {
      set({ services: [], decryptedSeeds: {}, loading: false, keyAccessDenied: true })
      return
    }

    const { data, error } = await supabase.from('services').select('*').eq('team_id', teamId)
    if (error || !data) {
      set({ loading: false })
      return
    }

    const services = data.map(mapRow)
    const decryptedSeeds: Record<string, string> = {}
    for (const service of services) {
      try {
        decryptedSeeds[service.id] = await decryptSeed(service.encryptedSeed, teamKey)
      } catch {
        decryptedSeeds[service.id] = ''
      }
    }
    set({ services, decryptedSeeds, loading: false })
  },

  addService: async (teamId, data, addedBy) => {
    const teamKey = (await ensureTeamKeyAccess(teamId)) ?? getCachedTeamKey(teamId)
    if (!teamKey) throw new Error('Sem acesso à chave desta equipe ainda')

    const encryptedSeed = await encryptSeed(data.seed, teamKey)
    const { data: row, error } = await supabase
      .from('services')
      .insert({
        team_id: teamId,
        name: data.name,
        issuer: data.issuer,
        account_name: data.accountName,
        encrypted_seed: encryptedSeed,
        color: data.color,
        tags: data.tags ?? [],
        added_by: addedBy,
      })
      .select('*')
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Não foi possível salvar o serviço')

    const service = mapRow(row)
    set((s) => ({
      services: [...s.services, service],
      decryptedSeeds: { ...s.decryptedSeeds, [service.id]: data.seed },
    }))
  },

  updateService: async (id, data) => {
    const { services, decryptedSeeds } = get()
    const service = services.find((s) => s.id === id)
    if (!service) return

    let newDecryptedSeed = decryptedSeeds[id]
    let encryptedSeed: string | undefined
    if (data.seed) {
      const teamKey = (await ensureTeamKeyAccess(service.teamId)) ?? getCachedTeamKey(service.teamId)
      if (!teamKey) throw new Error('Sem acesso à chave desta equipe')
      encryptedSeed = await encryptSeed(data.seed, teamKey)
      newDecryptedSeed = data.seed
    }

    const updates: Database['public']['Tables']['services']['Update'] = {
      name: data.name,
      issuer: data.issuer,
      account_name: data.accountName,
      color: data.color,
      tags: data.tags ?? [],
      ...(encryptedSeed !== undefined && { encrypted_seed: encryptedSeed }),
    }

    const { data: row, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Não foi possível atualizar o serviço')

    set((s) => ({
      services: s.services.map((sv) => (sv.id === id ? mapRow(row) : sv)),
      decryptedSeeds: { ...s.decryptedSeeds, [id]: newDecryptedSeed },
    }))
  },

  removeService: async (id) => {
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) throw new Error(error.message)
    set((s) => ({
      services: s.services.filter((sv) => sv.id !== id),
      decryptedSeeds: Object.fromEntries(Object.entries(s.decryptedSeeds).filter(([k]) => k !== id)),
    }))
  },

  setActiveTeam: (teamId) => {
    set({ activeTeamId: teamId })
    get().loadServices(teamId)
  },
  setSearch: (search) => set({ search }),
}))
