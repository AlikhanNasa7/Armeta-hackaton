import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import TopNav from '@/components/TopNav'
import AuthProvider from '@/components/AuthProvider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Signature Analyzer',
  description: 'Visualize detected signatures, stamps, and QR codes.',
  icons: {
    icon: 'https://www.armeta.ai/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-slate-950">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-screen bg-slate-950 text-slate-50 antialiased`}
      >
        <AuthProvider>
          <Toaster />
          <div className="flex h-full flex-col bg-slate-950">
            <TopNav />

            <div
              className="flex w-full h-full"
              style={{
                backgroundImage: 'url(/bg.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <main className="flex-1 overflow-y-auto px-6 pt-6">
                {children}
              </main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
