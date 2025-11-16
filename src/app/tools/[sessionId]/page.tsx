'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, FileText, Zap, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  fetchDocument,
  fetchSessionFiles,
  SessionFilterParams,
} from '@/lib/api'
import { DocumentDetail, SessionFilteredFile } from '@/lib/types'
import { PdfWithOverlays } from '@/components/PdfWithOverlays'

const FILTERS = [
  {
    id: 'no-signature',
    label: 'Find pages without a signature',
    description: 'Highlight pages missing required signatures.',
    query: { has_signature: false } satisfies SessionFilterParams,
  },
  {
    id: 'no-stamp',
    label: 'Find all pages with no stamp',
    description: 'Surface documents lacking official stamps.',
    query: { has_stamp: false } satisfies SessionFilterParams,
  },
  {
    id: 'has-qr',
    label: 'Find pages with QR codes',
    description: 'Capture attachments that include QR credentials.',
    query: { has_qr: true } satisfies SessionFilterParams,
  },
]

type FilterState = Record<string, boolean>

export default function ToolsSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    'no-signature': true,
  })
  const [isApplying, setIsApplying] = useState(false)
  const [files, setFiles] = useState<SessionFilteredFile[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfTotalPages, setPdfTotalPages] = useState(1)
  const [resolvedPdfPage, setResolvedPdfPage] = useState(1)
  const [fileDetails, setFileDetails] = useState<
    Record<string, DocumentDetail>
  >({})
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const activeFile = useMemo(
    () => files.find((file) => file.id === activeFileId) ?? files[0] ?? null,
    [files, activeFileId]
  )
  const filteredPages = useMemo(
    () => activeFile?.pages ?? [],
    [activeFile?.pages]
  )
  const activeDetail = activeFile?.id ? fileDetails[activeFile.id] : null
  const viewerFileUrl = activeDetail?.fileUrl || activeFile?.fileUrl || ''
  const currentPdfPage = currentPage

  useEffect(() => {
    if (!activeFile) return
    setCurrentPage(filteredPages[0] ?? 1)
  }, [activeFile, filteredPages])

  useEffect(() => {
    if (files.length === 0) {
      setActiveFileId(null)
      setCurrentPage(1)
      return
    }
    setActiveFileId((prev) =>
      prev && files.some((file) => file.id === prev) ? prev : files[0].id
    )
    setCurrentPage(files[0].pages[0] ?? 1)
  }, [files])

  useEffect(() => {
    if (!activeFile?.id || fileDetails[activeFile.id]) return
    let cancelled = false
    setIsDetailLoading(true)
    fetchDocument(activeFile.id)
      .then((detail) => {
        if (cancelled) return
        setFileDetails((prev) => ({ ...prev, [activeFile.id]: detail }))
      })
      .catch((error) => {
        console.error(error)
        toast.error('Failed to load document details.')
      })
      .finally(() => {
        if (!cancelled) setIsDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeFile?.id, fileDetails])

  const buildQuery = useCallback((): SessionFilterParams => {
    const query: SessionFilterParams = {}
    FILTERS.forEach((filter) => {
      if (activeFilters[filter.id]) {
        Object.assign(query, filter.query)
      }
    })
    return query
  }, [activeFilters])

  const handleApplyFilters = useCallback(async () => {
    if (!sessionId) return
    try {
      setIsApplying(true)
      const query = buildQuery()
      const data = await fetchSessionFiles(sessionId, query)
      setFiles(data)
      if (data.length === 0) {
        toast('No documents matched the selected filters.', {
          icon: 'ℹ️',
        })
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to fetch filtered documents.')
    } finally {
      setIsApplying(false)
    }
  }, [buildQuery, sessionId])

  const toggleFilter = (id: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const handleDownload = useCallback(async () => {
    if (!activeFile || !viewerFileUrl) {
      toast.error('Select a document to download.')
      return
    }
    try {
      const response = await fetch(viewerFileUrl)
      if (!response.ok) {
        throw new Error('Unable to download source PDF.')
      }
      const arrayBuffer = await response.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const suffix =
        filteredPages.length > 0 ? `-pages-${filteredPages.join('-')}` : ''
      link.href = url
      link.download = `${activeFile.filename.replace(
        /\.[^/.]+$/,
        ''
      )}${suffix}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      toast.error('Failed to download document.')
    }
  }, [activeFile, filteredPages, viewerFileUrl])

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(pdfTotalPages, prev + 1))
  }

  const viewerKey = `${activeFile?.id || 'empty'}-${currentPdfPage}`

  return (
    <div className="mx-auto flex h-full w-full flex-col gap-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/document')}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-white">
          <Zap className="h-4 w-4" />
          Post-Rec Tools
        </div>
      </div>

      <div className="flex flex-1 gap-8">
        <div className="flex w-full flex-[1.1] flex-col gap-6 rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Fast Actions</h2>
              <Sparkles className="h-4 w-4 text-cyan-300" />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => toggleFilter(filter.id)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                    activeFilters[filter.id]
                      ? 'bg-white text-slate-900'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={isApplying}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isApplying && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Proceed
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Filtered Documents
              </h3>
              <span className="text-xs text-white/60">
                {files.length} files
              </span>
            </div>
            {files.length === 0 ? (
              <p className="text-sm text-white/60">
                Apply filters to see matching documents.
              </p>
            ) : (
              <div className="flex max-h-[45vh] flex-col gap-3 overflow-y-auto pr-1">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => {
                      setActiveFileId(file.id)
                      setCurrentPage(file.pages[0] ?? 1)
                    }}
                    className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition ${
                      file.id === activeFile?.id
                        ? 'border-cyan-400 bg-cyan-400/10 text-white'
                        : 'border-white/10 bg-black/40 text-white/70 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4" />
                      <span className="truncate">{file.filename}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-[0.9] flex-col rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                {activeFile?.filename || 'Select a document'}
              </p>
              <p className="text-xs text-white/50">
                Page {resolvedPdfPage} / {pdfTotalPages}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!activeFile || !viewerFileUrl}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
          {filteredPages.length > 0 ? (
            <p className="mb-4 text-xs text-white/60">
              Download includes the original file with focus on pages{' '}
              {filteredPages.join(', ')}.
            </p>
          ) : (
            <p className="mb-4 text-xs text-white/60">
              No filtered pages yet. Adjust filters to highlight pages of
              interest.
            </p>
          )}
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={goToPrevPage}
              disabled={resolvedPdfPage <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/80 hover:border-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              ‹
            </button>
            <button
              onClick={goToNextPage}
              disabled={resolvedPdfPage >= pdfTotalPages}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/80 hover:border-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              ›
            </button>
          </div>
          <div className="min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
            {!activeFile ? (
              <div className="flex h-full items-center justify-center text-sm text-white/60">
                Select a document to preview
              </div>
            ) : viewerFileUrl ? (
              <PdfWithOverlays
                key={viewerKey}
                fileUrl={viewerFileUrl}
                detections={activeDetail?.detections ?? []}
                currentPage={currentPdfPage}
                onPageCountChange={setPdfTotalPages}
                onResolvedPageChange={setResolvedPdfPage}
              />
            ) : isDetailLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-white/60">
                Loading PDF…
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-red-300">
                Unable to load document preview.
              </div>
            )}
          </div>
          <div className="mt-4">
            {filteredPages.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {filteredPages.map((page) => (
                  <button
                    key={`${activeFile?.id}-page-${page}`}
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      page === resolvedPdfPage
                        ? 'bg-cyan-400 text-slate-900'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Page {page}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/60">
                No pages match the selected filters yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
