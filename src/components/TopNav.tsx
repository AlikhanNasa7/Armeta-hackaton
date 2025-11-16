'use client'

import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vparu.kz'
const AUTH_URL = `${BACKEND_URL}/auth/google/login`

export default function TopNav() {
  const { user, isAuthenticated, logout } = useAuthStore()

  const handleSignIn = () => {
    // Store current path to redirect back after auth
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_redirect', window.location.pathname)
    }
    window.location.href = AUTH_URL
  }

  const handleSignOut = async () => {
    try {
      // Call backend logout endpoint
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      })

      // Clear local auth state
      logout()

      // Show success message
      toast.success('Successfully signed out', {
        duration: 2000,
        position: 'top-center',
        style: {
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#fff',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '12px',
          padding: '12px 20px',
        },
      })

      // Redirect to home page
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
      // Even if the backend request fails, clear local state
      logout()
      window.location.href = '/'
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/90 backdrop-blur">
      <div className="mx-auto flex w-full flex-wrap items-center gap-4 px-6 py-4">
        <div className="flex flex-1 items-center gap-4">
          <Link href="/">
            <Image src="/icon.png" alt="Logo" width={128} height={32} />
          </Link>
          <span className="rounded-full bg-blue-500/15 px-4 py-1 text-sm font-semibold text-blue-400">
            Digital Inspector
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-white/70">
          <Link href="/document" className="transition hover:text-white">
            Documents
          </Link>
          <Link
            href="https://www.armeta.ai/"
            target="_blank"
            className="transition hover:text-white"
          >
            Join Our Team
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {user?.picture && (
                <Image
                  src={user.picture}
                  alt={user.name || user.email}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <button
                onClick={handleSignOut}
                className="cursor-pointer inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-white/20"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg transition hover:bg-slate-100"
            >
              <Image src="/signin-icon.png" alt="User" width={20} height={20} />
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
