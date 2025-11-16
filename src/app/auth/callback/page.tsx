'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vparu.kz'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/me`, {
          method: 'GET',
          credentials: 'include',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch user information')
        }

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

        // Show success toast
        toast.success(`Welcome, ${user.given_name}!`, {
          duration: 3000,
          position: 'top-center',
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#fff',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '12px',
            padding: '12px 20px',
          },
        })

        // Redirect to home or intended page
        const redirectTo = sessionStorage.getItem('auth_redirect') || '/'
        sessionStorage.removeItem('auth_redirect')
        router.push(redirectTo)
      } catch (err) {
        console.error('Auth callback error:', err)
        setError('Authentication failed. Please try again.')

        toast.error('Authentication failed', {
          duration: 3000,
          position: 'top-center',
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#fff',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '12px 20px',
          },
        })

        // Redirect to home after showing error
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    }

    fetchUserInfo()
  }, [setUser, router])

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-400 border-r-transparent"></div>
        <p className="text-sm text-white/70">Completing sign in...</p>
      </div>
    </div>
  )
}
