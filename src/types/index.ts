export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  teams: Team[]
  isSuperAdmin: boolean
}

export interface Team {
  id: string
  name: string
  slug: string
  memberCount: number
  role?: 'admin' | 'member'
}

export interface TOTPService {
  id: string
  name: string
  issuer: string
  accountName: string
  encryptedSeed: string
  icon?: string
  color?: string
  teamId: string
  addedBy: string
  createdAt: string
  tags?: string[]
}

export interface TOTPCode {
  serviceId: string
  code: string
  expiresAt: number
  period: number
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

export interface ServiceFormData {
  name: string
  issuer: string
  accountName: string
  seed: string
  color?: string
  tags?: string[]
}
