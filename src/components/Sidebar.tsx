'use client'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, FileText, Plus } from 'lucide-react'
import { useDocumentHistory } from '@/lib/useDocumentHistory'
import {
  fetchSessions,
  updateSessionName,
  uploadFileToSession,
  Session,
} from '@/lib/api'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { addDocument } = useDocumentHistory()

  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [openSessions, setOpenSessions] = useState<
    Record<string | number, boolean>
  >({})
  const [modalSessionId, setModalSessionId] = useState<string | number | null>(
    null
  )
  const [editingSessionId, setEditingSessionId] = useState<
    string | number | null
  >(null)
  const [editingSessionName, setEditingSessionName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // Fetch sessions from backend
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await fetchSessions()
        setSessions(data)

        // Check if there's a session ID to open from sessionStorage
        const openSessionId = sessionStorage.getItem('open_session_id')
        if (openSessionId) {
          // Open only the specified session
          setOpenSessions({ [openSessionId]: true })
          sessionStorage.removeItem('open_session_id')
        } else if (data.length > 0) {
          // Open the first session by default
          setOpenSessions({ [data[0].id]: true })
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error)
        toast.error('Failed to load sessions', {
          duration: 2000,
          position: 'top-center',
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#fff',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '12px 20px',
          },
        })
      } finally {
        setIsLoadingSessions(false)
      }
    }

    loadSessions()
  }, [])

  const activeId = useMemo(() => {
    if (!pathname || pathname === '/') return null
    const segments = pathname.split('/').filter(Boolean)
    return segments[0] || null
  }, [pathname])

  const toggleSession = (id: string | number) => {
    setOpenSessions((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAddClick = (sessionId: string | number) => {
    setModalSessionId(sessionId)
  }

  const modalSessionName =
    modalSessionId != null
      ? sessions.find((session) => session.id === modalSessionId)?.name
      : undefined

  const handleUploadSuccess = (documentId: string, title: string) => {
    const createdAt = new Date().toISOString()
    addDocument({ id: documentId, title, createdAt })
    setModalSessionId(null)
    // Refresh sessions
    fetchSessions().then(setSessions).catch(console.error)
    router.push(`/document/${documentId}`)
  }

  // Focus input when editing starts
  useEffect(() => {
    if (editingSessionId !== null && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingSessionId])

  const handleSessionNameDoubleClick = (session: Session) => {
    setEditingSessionId(session.id)
    setEditingSessionName(session.name)
  }

  const handleSessionNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingSessionName(e.target.value)
  }

  const handleSessionNameBlur = async () => {
    if (editingSessionId === null) return

    const newName = editingSessionName.trim()
    if (!newName) {
      setEditingSessionId(null)
      return
    }

    const session = sessions.find((s) => s.id === editingSessionId)
    if (!session || session.name === newName) {
      setEditingSessionId(null)
      return
    }

    try {
      await updateSessionName(Number(editingSessionId), newName)

      // Update local state
      setSessions((prev) =>
        prev.map((s) =>
          s.id === editingSessionId ? { ...s, name: newName } : s
        )
      )

      toast.success('Session name updated', {
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
    } catch (error) {
      console.error('Failed to update session name:', error)
      toast.error('Failed to update session name', {
        duration: 2000,
        position: 'top-center',
        style: {
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#fff',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '12px 20px',
        },
      })
    } finally {
      setEditingSessionId(null)
    }
  }

  const handleSessionNameKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      setEditingSessionId(null)
    }
  }

  return (
    <>
      <aside className="hidden h-full w-80 shrink-0 flex-col bg-white/4 px-6 py-6 text-white shadow-2xl sm:flex backdrop-blur-lg">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 rounded-[12px] bg-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <Image
            src="/chatplus-icon.png"
            alt="Chat Plus"
            width={20}
            height={20}
          />
          New session
        </Link>

        <div className="mb-3 text-base font-semibold text-white/70">
          Sessions
        </div>

        {isLoadingSessions ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto pr-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-[22px] bg-white/5 p-4 text-white ring-1 ring-white/10"
              >
                <div className="flex items-center justify-between">
                  {editingSessionId === session.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingSessionName}
                      onChange={handleSessionNameChange}
                      onBlur={handleSessionNameBlur}
                      onKeyDown={handleSessionNameKeyDown}
                      className="flex-1 rounded-lg bg-white/10 px-2 py-1 text-[15px] font-semibold text-white outline-none ring-2 ring-blue-400"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        onDoubleClick={() =>
                          handleSessionNameDoubleClick(session)
                        }
                        className="cursor-pointer text-[15px] font-semibold hover:text-white/80"
                      >
                        {session.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSession(session.id)}
                        className="flex items-center"
                      >
                        <ChevronDown
                          className={`h-4 w-4 text-white/80 transition-transform ${
                            openSessions[session.id] ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                  {editingSessionId !== session.id && (
                    <button
                      type="button"
                      onClick={() => handleAddClick(session.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-500/25 px-3 py-1 text-xs font-semibold text-blue-200 transition hover:bg-blue-500/35"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  )}
                </div>

                {openSessions[session.id] && (
                  <div className="mt-4 space-y-2">
                    {session.files && session.files.length === 0 ? (
                      <p className="py-2 text-center text-xs text-white/50">
                        No files yet
                      </p>
                    ) : (
                      [...session.files].reverse().map((file) => {
                        const isActive = activeId === file.id
                        const href = `/document/${file.id}`
                        return (
                          <Link
                            key={file.id}
                            href={href}
                            className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                              isActive
                                ? 'bg-blue-500/25 text-blue-200'
                                : 'text-white/80 hover:bg-white/10'
                            }`}
                            title={file.filename}
                          >
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/25 text-blue-200">
                              <FileText className="h-3.5 w-3.5" />
                            </span>
                            <span className="truncate">{file.filename}</span>
                          </Link>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </aside>

      <AddFileModal
        open={modalSessionId !== null}
        sessionId={modalSessionId}
        sessionName={modalSessionName}
        onClose={() => setModalSessionId(null)}
        onConfirm={handleUploadSuccess}
      />
    </>
  )
}

type AddFileModalProps = {
  open: boolean
  sessionId: string | number | null
  sessionName?: string
  onClose: () => void
  onConfirm: (documentId: string, title: string) => void
}

function AddFileModal({
  open,
  sessionId,
  sessionName,
  onClose,
  onConfirm,
}: AddFileModalProps) {
  if (!open) return null

  return (
    <ModalContent
      sessionId={sessionId}
      sessionName={sessionName}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}

function ModalContent({
  sessionId,
  sessionName,
  onClose,
  onConfirm,
}: {
  sessionId: string | number | null
  sessionName?: string
  onClose: () => void
  onConfirm: (documentId: string, title: string) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null
    setFile(selectedFile)
    setError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) {
      setError('Please attach a file.')
      return
    }
    if (!sessionId) {
      setError('Session ID is missing.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await uploadFileToSession(Number(sessionId), file)
      onConfirm(String(result.id), result.filename)
    } catch (e) {
      console.error(e)
      setError('Upload failed. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-950 p-6 text-white shadow-2xl ring-1 ring-white/10">
        <h2 className="text-lg font-semibold">
          Add file{sessionName ? ` to ${sessionName}` : ''}
        </h2>
        <p className="mt-2 text-sm text-white/70">
          Attach a document and we&apos;ll process it and add it to this
          session.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-white/60">
              File
            </label>
            <div className="rounded-2xl border border-dashed border-white/25 bg-black/40 px-3 py-4 text-sm">
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="w-full text-xs text-white/80 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-900 hover:file:bg-slate-100"
              />
              {file && (
                <p className="mt-2 text-xs text-white/60">
                  Selected: {file.name}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {error}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-blue-400 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
              )}
              {isSubmitting ? 'Uploading...' : 'Upload file'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
