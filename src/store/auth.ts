import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
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
        sessionStorage.setItem('totp_token', token)
        set({ user, token })
      },
      setMasterKey: (key) => set({ masterKey: key }),
      setKeyPair: (keyPair) => set({ keyPair }),
      logout: () => {
        sessionStorage.removeItem('totp_token')
        set({ user: null, token: null, masterKey: null, keyPair: null })
      },
    }),
    {
      name: 'totp-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
)
