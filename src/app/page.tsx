'use client'
import Image from 'next/image'
import { FormEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadDocument } from '@/lib/api'
import { useDocumentHistory } from '@/lib/useDocumentHistory'
import { useAuthStore } from '@/store/authStore'

const AUTH_URL = `${
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vparu.kz'
}/auth/google/login`

// Helper to get formatted session name (e.g., "November 16th")
function getSessionName(): string {
  const date = new Date()
  const month = date.toLocaleString('en-US', { month: 'long' })
  const day = date.getDate()
  const suffix = ['th', 'st', 'nd', 'rd'][
    day % 10 > 3 || Math.floor((day % 100) / 10) === 1 ? 0 : day % 10
  ]
  return `${month} ${day}${suffix}`
}

export default function HomePage() {
  const router = useRouter()
  const { addDocument } = useDocumentHistory()
  const { isAuthenticated } = useAuthStore()
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    if (selectedFiles.length > 5) {
      setError('Maximum 5 files allowed')
      setFiles(selectedFiles.slice(0, 5))
    } else {
      setError(null)
      setFiles(selectedFiles)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (files.length === 0) {
      setError('Please select at least one file.')
      return
    }
    if (files.length > 5) {
      setError('Maximum 5 files allowed.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      const sessionName = getSessionName()
      const result = await uploadDocument({
        results: files,
        sessionName,
      })

      // Add all uploaded documents to history
      const createdAt = new Date().toISOString()
      if (result.results && result.results.length > 0) {
        result.results.forEach((file: { id: string; filename: string }) => {
          addDocument({ id: String(file.id), title: file.filename, createdAt })
        })

        // Store the new session ID in sessionStorage to open it in sidebar
        if (result.session_id) {
          sessionStorage.setItem('open_session_id', String(result.session_id))
        }

        // Navigate to /document route
        router.push('/document')
      } else {
        throw new Error('No files returned from upload')
      }
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-fit flex-col gap-8 pt-16">
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-lg">
        <form className="relative gap-10" onSubmit={handleSubmit}>
          <div className="space-y-6 text-white">
            <div className="flex items-center gap-4">
              <Image
                src="/folder-icon.png"
                alt="Folder"
                width={100}
                height={100}
              />
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-semibold">Upload Files</h2>
                <p className="mt-1 text-xs font-medium leading-5 text-white/70">
                  Select and upload documents you want to process
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/15 bg-black/50 p-6">
              <div className="flex items-start gap-4">
                <Image
                  src="/upload-icon.png"
                  alt="Upload"
                  width={36}
                  height={36}
                />
                <div>
                  <p className="text-sm font-medium text-white/40">
                    Choose files or drag & drop them here
                  </p>
                  <p className="text-sm font-medium text-white/80">
                    PDF, JPEG, PNG up to 100MB (max 5 files)
                  </p>
                  {files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {files.map((file, index) => (
                        <p key={index} className="text-xs text-white/70">
                          {index + 1}. {file.name}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      // Store current path to redirect back after auth
                      if (typeof window !== 'undefined') {
                        sessionStorage.setItem(
                          'auth_redirect',
                          window.location.pathname
                        )
                      }
                      window.location.href = AUTH_URL
                      return
                    }
                    fileInputRef.current?.click()
                  }}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 shadow"
                  disabled={isSubmitting}
                >
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  multiple
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3">
              <p className="text-xs text-white/60">
                {isSubmitting
                  ? 'Analyzing… This may take up to 10 seconds.'
                  : 'Your documents remain private on this device.'}
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                )}
                {isSubmitting
                  ? 'Analyzing…'
                  : `Analyze ${
                      files.length > 0
                        ? `${files.length} document${
                            files.length > 1 ? 's' : ''
                          }`
                        : 'documents'
                    }`}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
