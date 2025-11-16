import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type User = {
  sub: string // Google user ID
  email: string
  email_verified: boolean
  name: string
  picture: string
  given_name: string
  family_name: string
}

type AuthState = {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
    }
  )
)
