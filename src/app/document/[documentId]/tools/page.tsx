'use client'

import { startTransition, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Sparkles,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { fetchDocument } from '@/lib/api'
import { DocumentDetail } from '@/lib/types'
import { PdfWithOverlays } from '@/components/PdfWithOverlays'

export default function PostRecToolsPage() {
  const params = useParams<{ documentId: string }>()
  const router = useRouter()
  const documentId = params?.documentId
  const [detail, setDetail] = useState<DocumentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(
    null
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!documentId) return
    let cancelled = false
    startTransition(() => {
      setIsLoading(true)
      setError(null)
    })
    fetchDocument(documentId)
      .then((data) => {
        if (cancelled) return
        startTransition(() => {
          setDetail(data)
          setIsLoading(false)
        })
      })
      .catch(() => {
        if (cancelled) return
        startTransition(() => {
          setError('Unable to load document details.')
          setIsLoading(false)
        })
      })
    return () => {
      cancelled = true
    }
  }, [documentId])

  useEffect(() => {
    if (!detail) {
      startTransition(() => {
        setSelectedDetectionId(null)
        setCurrentPage(1)
      })
      return
    }
    if (detail.detections.length > 0) {
      startTransition(() => {
        setSelectedDetectionId(detail.detections[0].id)
        setCurrentPage(detail.detections[0].page || 1)
      })
    } else {
      startTransition(() => {
        setSelectedDetectionId(null)
        setCurrentPage(1)
      })
    }
  }, [detail])

  if (!documentId) {
    return <div className="text-sm text-red-300">Document not found.</div>
  }

  return (
    <div className="mx-auto flex h-full w-full gap-6">
      <div className="flex w-full flex-col gap-6">
        {/* Header with Back and Post-Rec Tools badge */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/document/${documentId}`)}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-4 py-2 text-sm font-semibold text-white">
            <Zap className="h-4 w-4" />
            Post-Rec Tools
          </div>
        </div>

        <div className="flex gap-6 h-full">
          {/* Left Sidebar - AI Overview */}
          <aside className="flex-1">
            {/* AI Overview Section */}
            <section className="h-full rounded-3xl border border-white/10 bg-white/4 backdrop-blur-lg p-6 shadow-2xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span>AI Overview</span>
              </div>
              <div className="mt-4 max-h-[calc(100vh-180px)] overflow-y-auto pr-2">
                <p className="text-sm leading-relaxed text-slate-100">
                  {/* Backend will provide the AI overview text */}
                  This is where the AI-generated overview from the backend will
                  be displayed. The backend should return this field in the
                  document response.
                </p>
              </div>
            </section>
          </aside>

          {/* PDF Viewer - Right Side */}
          <div className="flex-[1.5] rounded-3xl border border-white/10 bg-white/4 p-6 shadow-2xl backdrop-blur-lg">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                  <span className="text-lg">📄</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {detail?.title ?? 'Loading document…'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Page {currentPage} / {totalPages || 1}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="ml-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs text-white/70">
                    <span className="font-semibold text-white">
                      {currentPage}
                    </span>
                    <span className="text-white/40">/</span>
                    <span>{totalPages || 1}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Previous page"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage <= 1}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-sm text-white hover:border-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next page"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(totalPages || prev + 1, prev + 1)
                        )
                      }
                      disabled={currentPage >= (totalPages || 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-sm text-white hover:border-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
              {isLoading && (
                <div className="flex min-h-[200px] items-center justify-center text-slate-400">
                  Loading document…
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {!isLoading && !error && detail && (
                <PdfWithOverlays
                  fileUrl={detail.fileUrl}
                  detections={detail.detections}
                  selectedDetectionId={selectedDetectionId}
                  onSelectDetection={setSelectedDetectionId}
                  currentPage={currentPage}
                  onPageCountChange={setTotalPages}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
