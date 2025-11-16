'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vparu.kz'

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { setUser } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/proxy/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const userData = await response.json()

          // Extract mandatory fields from the response
          const user = {
            sub: userData.sub,
            email: userData.email,
            email_verified: userData.email_verified,
            name: userData.name,
            picture: userData.picture,
            given_name: userData.given_name,
            family_name: userData.family_name,
          }

          // Store user info in Zustand
          setUser(user)
        } else {
          // Not authenticated, clear any stale data
          setUser(null)
        }
      } catch (err) {
        console.error('Auth check error:', err)
        // On error, clear auth state
        setUser(null)
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [setUser])

  // Show loading screen while checking auth
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-400 border-r-transparent"></div>
          <p className="text-sm text-white/70">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
