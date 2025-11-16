'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuthStore()
  const hasShownToast = useRef(false)

  useEffect(() => {
    if (!isAuthenticated && !hasShownToast.current) {
      // Show toast notification only once
      hasShownToast.current = true
      toast.error('First you need to login', {
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

      // Store current path to redirect back after auth
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('auth_redirect', pathname)
      }
      router.push('/')
    }
  }, [isAuthenticated, pathname, router])

  // Show loading while checking auth or redirecting
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-400 border-r-transparent"></div>
          <p className="text-sm text-white/70">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
