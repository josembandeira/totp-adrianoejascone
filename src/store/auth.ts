import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import type { KeyPair } from '@/lib/crypto'

interface AuthStore {
  user: User | null
  token: string | null
  masterKey: Uint8Array | null
  keyPair: KeyPair | null
  login: (user: User, token: string) => void
  setMasterKey: (key: Uint8Array) => void
  setKeyPair: (keyPair: KeyPair) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      masterKey: null,
      keyPair: null,
      login: (user, token) => {
        localStorage.setItem('totp_token', token)
        set({ user, token })
      },
      setMasterKey: (key) => set({ masterKey: key }),
      setKeyPair: (keyPair) => set({ keyPair }),
      logout: () => {
        localStorage.removeItem('totp_token')
        set({ user: null, token: null, masterKey: null, keyPair: null })
      },
    }),
    {
      name: 'totp-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
)
