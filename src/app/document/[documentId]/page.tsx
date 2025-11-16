'use client'

import {
  Fragment,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as pdfjsLib from 'pdfjs-dist'
import { fetchDocument, fetchFileSummary } from '@/lib/api'
import { DetectionType, DocumentDetail } from '@/lib/types'
import { useDocumentHistory } from '@/lib/useDocumentHistory'
import { PdfWithOverlays } from '@/components/PdfWithOverlays'
import { Sparkles, ScanSearch } from 'lucide-react'

export default function DocumentViewerPage() {
  const params = useParams<{ documentId: string }>()
  const router = useRouter()
  const documentId = params?.documentId
  const [detail, setDetail] = useState<DocumentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(
    null
  )
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const [isThumbnailsLoading, setIsThumbnailsLoading] = useState(false)
  const { addDocument } = useDocumentHistory()
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null)
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [detailedSummary, setDetailedSummary] = useState<{
    filename: string
    analysis: string
  } | null>(null)

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
          addDocument({
            id: data.id,
            title: data.title,
            createdAt: data.createdAt,
          })
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
  }, [documentId, addDocument])

  useEffect(() => {
    if (!detail) {
      setSelectedDetectionId(null)
      setCurrentPage(1)
      setTotalPages(1)
      return
    }
    if (detail.detections.length > 0) {
      setSelectedDetectionId(detail.detections[0].id)
      setCurrentPage(detail.detections[0].page || 1)
    } else {
      setSelectedDetectionId(null)
      setCurrentPage(1)
    }
  }, [detail])

  useEffect(() => {
    if (!detail || !selectedDetectionId) {
      setQrPreviewUrl(null)
      return
    }
    const active = detail.detections.find(
      (detection) => detection.id === selectedDetectionId
    )
    if (active?.type === 'qrcode' && typeof active.payload?.url === 'string') {
      setQrPreviewUrl(active.payload.url)
    } else {
      setQrPreviewUrl(null)
    }
  }, [detail, selectedDetectionId])

  useEffect(() => {
    if (!detail || detail.detections.length === 0) {
      setThumbnails({})
      return
    }
    let cancelled = false
    setIsThumbnailsLoading(true)

    const generateThumbnails = async () => {
      const loadingTask = pdfjsLib.getDocument(detail.fileUrl)
      const pdf = await loadingTask.promise
      const pageCache = new Map<
        number,
        { canvas: HTMLCanvasElement; viewport: pdfjsLib.PDFPageViewport }
      >()

      try {
        const entries: [string, string][] = []
        for (const detection of detail.detections) {
          if (cancelled) break
          const { canvas, viewport } = await ensureRenderedPage(
            pdf,
            detection.page,
            pageCache
          )
          const image = cropDetectionFromCanvas(canvas, viewport, detection)
          entries.push([detection.id, image])
        }
        if (!cancelled) {
          setThumbnails(Object.fromEntries(entries))
        }
      } catch (thumbnailError) {
        console.error('Failed to generate thumbnails', thumbnailError)
        if (!cancelled) {
          setThumbnails({})
        }
      } finally {
        loadingTask.destroy()
        if (!cancelled) {
          setIsThumbnailsLoading(false)
        }
      }
    }

    void generateThumbnails()

    return () => {
      cancelled = true
    }
  }, [detail])

  const detectionSections = useMemo(() => {
    if (!detail) return { signature: [], stamp: [], qrcode: [] }
    return detail.detections.reduce<
      Record<DetectionType, DocumentDetail['detections']>
    >(
      (acc, detection) => {
        // Safety check: only push if the type exists in accumulator
        if (acc[detection.type]) {
          acc[detection.type].push(detection)
        } else {
          console.warn('Unknown detection type:', detection.type, detection)
        }
        return acc
      },
      { signature: [], stamp: [], qrcode: [] }
    )
  }, [detail])

  const handleDetectionSelect = useCallback(
    (detection: DocumentDetail['detections'][number]) => {
      setSelectedDetectionId(detection.id)
      setCurrentPage(detection.page)
    },
    []
  )

  const handleOpenSummaryModal = useCallback(async () => {
    if (!documentId) return
    setIsSummaryModalOpen(true)
    if (detailedSummary) return
    try {
      setSummaryError(null)
      setIsSummaryLoading(true)
      const data = await fetchFileSummary(documentId)
      setDetailedSummary({
        filename: data.filename,
        analysis: data.analysis,
      })
    } catch (err) {
      console.error('Failed to load detailed summary', err)
      setSummaryError('Unable to load detailed summary.')
    } finally {
      setIsSummaryLoading(false)
    }
  }, [documentId, detailedSummary])

  const safeQrPreviewUrl = useMemo(() => {
    if (!qrPreviewUrl) return null
    try {
      const parsed = new URL(qrPreviewUrl)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null
      }
      return parsed.toString()
    } catch {
      return null
    }
  }, [qrPreviewUrl])

  if (!documentId) {
    return <div className="text-sm text-red-300">Document not found.</div>
  }

  return (
    <div className="mx-auto flex h-full w-full gap-6">
      <div className="flex w-full flex-col gap-6">
        <div className="flex gap-6">
          <div className="flex-[1.5] rounded-3xl h-fit border border-white/10 bg-white/4 p-6 shadow-2xl backdrop-blur-lg">
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
                      ‹
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
                      ›
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
                  onResolvedPageChange={(page) => {
                    setCurrentPage(page)
                  }}
                />
              )}
            </div>
          </div>
          <div className="flex h-fit w-full max-w-md flex-col space-y-4">
            <section className="w-full rounded-3xl  bg-white/8 p-6 shadow-2xl backdrop-blur-lg">
              <div className="flex items-center justify-between gap-2 text-sm font-semibold text-white">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span>AI Overview</span>
                </div>
                <div className="flex items-center gap-2">
                  {summaryError && (
                    <span className="text-xs text-red-400">{summaryError}</span>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenSummaryModal}
                    className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                    disabled={isSummaryLoading}
                  >
                    {isSummaryLoading ? 'Loading...' : 'View full'}
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-100">
                {detail?.shortSummary?.trim() ? (
                  <FormattedSummary text={detail.shortSummary} />
                ) : (
                  <p>No AI summary is available for this document yet.</p>
                )}
              </div>
            </section>

            <section className="h-fit max-h-[500px] relative w-full overflow-hidden rounded-[30px] border border-white/10 bg-white/4 p-6 shadow-2xl backdrop-blur-lg">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                    <ScanSearch className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-sm font-semibold text-white">
                    Detected Elements
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (detail?.sessionId) {
                      router.push(`/tools/${detail.sessionId}`)
                    } else {
                      router.push('/document')
                    }
                  }}
                  disabled={!detail?.sessionId}
                  className="inline-flex items-center gap-2 rounded-[15px] bg-gradient-to-tr from-blue-500/80 to-sky-400/80 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:from-blue-400 hover:to-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white">
                    <span className="h-2 w-3 bg-blue-500" />
                  </span>
                  Post-Rec Tools
                </button>
              </div>

              <div className="mt-6 max-h-[calc(100vh-320px)] space-y-6 overflow-y-auto pr-2">
                {/* Signatures row */}
                <div>
                  <p className="text-sm font-semibold text-white/70">
                    Signatures
                  </p>
                  <div className="mt-3 flex flex-nowrap items-center gap-3 overflow-x-auto pb-1">
                    {detectionSections.signature.length === 0 && (
                      <p className="text-xs text-slate-500">
                        No signatures detected.
                      </p>
                    )}
                    {detectionSections.signature.map((detection, index) => (
                      <button
                        key={detection.id}
                        onClick={() => handleDetectionSelect(detection)}
                        className={`relative flex h-20 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-black/60 px-0 shadow-inner transition hover:ring-2 hover:ring-cyan-400/70 ${
                          selectedDetectionId === detection.id
                            ? 'ring-2 ring-cyan-400/80'
                            : ''
                        }`}
                        style={{ minWidth: index === 0 ? 105 : 155 }}
                      >
                        {thumbnails[detection.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbnails[detection.id]}
                            alt={`Signature ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">
                            {isThumbnailsLoading ? 'Rendering…' : 'No preview'}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stamps */}
                <div>
                  <p className="text-sm font-semibold text-white/70">Stamps</p>
                  <div className="mt-3 flex flex-nowrap gap-3 overflow-x-auto pb-1">
                    {detectionSections.stamp.length === 0 && (
                      <p className="text-xs text-slate-500">
                        No stamps detected.
                      </p>
                    )}
                    {detectionSections.stamp.map((detection, index) => (
                      <button
                        key={detection.id}
                        onClick={() => handleDetectionSelect(detection)}
                        className={`relative flex h-20 w-[93px] items-center justify-center overflow-hidden rounded-[10px] bg-white shadow-inner transition hover:ring-2 hover:ring-cyan-400/70 ${
                          selectedDetectionId === detection.id
                            ? 'ring-2 ring-cyan-400/80'
                            : ''
                        }`}
                      >
                        {thumbnails[detection.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbnails[detection.id]}
                            alt={`Stamp ${index + 1}`}
                            className="h-20 w-20 object-contain"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">
                            {isThumbnailsLoading ? 'Rendering…' : 'No preview'}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Codes */}
                <div>
                  <p className="text-sm font-semibold text-white/70">
                    QR Codes
                  </p>
                  <div className="mt-3 flex flex-nowrap gap-3 overflow-x-auto pb-1">
                    {detectionSections.qrcode.length === 0 && (
                      <p className="text-xs text-slate-500">
                        No QR codes detected.
                      </p>
                    )}
                    {detectionSections.qrcode.map((detection, index) => (
                      <button
                        key={detection.id}
                        onClick={() => handleDetectionSelect(detection)}
                        className="relative h-20 w-[86px] overflow-hidden"
                      >
                        <div className="absolute left-3 top-2 h-14 w-14 rounded-[10px] bg-black/80">
                          {thumbnails[detection.id] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumbnails[detection.id]}
                              alt={`QR code ${index + 1}`}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                              {isThumbnailsLoading
                                ? 'Rendering…'
                                : 'No preview'}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  {safeQrPreviewUrl && (
                    <div className="mt-4 space-y-3 rounded-2xl border border-white/15 bg-black/40 p-4">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/60">
                        <span>QR Preview</span>
                        <a
                          href={safeQrPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-300 hover:text-cyan-100"
                        >
                          Open
                        </a>
                      </div>
                      <div className="overflow-hidden rounded-xl bg-white/90">
                        <iframe
                          key={safeQrPreviewUrl}
                          src={safeQrPreviewUrl}
                          className="h-72 w-full border-0"
                          loading="lazy"
                          sandbox="allow-scripts allow-same-origin allow-forms"
                          referrerPolicy="no-referrer"
                          title="QR preview"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      {isSummaryModalOpen && (
        <DetailedSummaryModal
          filename={detailedSummary?.filename || detail?.title || 'Document'}
          analysis={detailedSummary?.analysis}
          isLoading={isSummaryLoading}
          error={summaryError}
          onClose={() => setIsSummaryModalOpen(false)}
        />
      )}
    </div>
  )
}

function DetailedSummaryModal({
  filename,
  analysis,
  isLoading,
  error,
  onClose,
}: {
  filename: string
  analysis?: string
  isLoading: boolean
  error: string | null
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{filename}</h2>
            <p className="text-xs uppercase tracking-widest text-white/40">
              Detailed Summary
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/70 hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex min-h-[200px] items-center justify-center text-white/60">
              Loading detailed summary...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : analysis ? (
            <div className="space-y-4 text-sm leading-relaxed text-white/90">
              <FormattedSummary text={analysis} />
            </div>
          ) : (
            <p className="text-sm text-white/70">No detailed summary found.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function FormattedSummary({ text }: { text: string }) {
  if (!text?.trim()) return null
  const blocks = text
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
  return (
    <>
      {blocks.map((block, idx) => {
        const lines = block.split('\n').filter(Boolean)
        const isList = lines.every((line) => /^[-•]\s+/.test(line.trim()))
        if (isList) {
          return (
            <ul
              key={`${block}-${idx}`}
              className="list-disc space-y-1 pl-5 text-white/90"
            >
              {lines.map((line, lineIdx) => (
                <li key={`${lineIdx}-${line}`}>
                  {renderInlineText(line.replace(/^[-•]\s+/, ''))}
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={`${block}-${idx}`} className="text-white/90">
            {renderInlineText(block)}
          </p>
        )
      })}
    </>
  )
}

function renderInlineText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      const content = segment.slice(2, -2)
      return (
        <span key={`bold-${index}`} className="font-semibold text-white">
          {content}
        </span>
      )
    }
    return <Fragment key={`text-${index}`}>{segment}</Fragment>
  })
}

async function ensureRenderedPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  cache: Map<
    number,
    { canvas: HTMLCanvasElement; viewport: pdfjsLib.PDFPageViewport }
  >
) {
  if (cache.has(pageNumber)) {
    return cache.get(pageNumber)!
  }
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvasContext: ctx, viewport }).promise
  const rendered = { canvas, viewport }
  cache.set(pageNumber, rendered)
  return rendered
}

function cropDetectionFromCanvas(
  canvas: HTMLCanvasElement,
  viewport: pdfjsLib.PDFPageViewport,
  detection: DocumentDetail['detections'][number]
) {
  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value))

  const srcX = clamp(detection.x * viewport.width, 0, viewport.width)
  const srcY = clamp(detection.y * viewport.height, 0, viewport.height)
  const srcW = clamp(detection.width * viewport.width, 1, viewport.width - srcX)
  const srcH = clamp(
    detection.height * viewport.height,
    1,
    viewport.height - srcY
  )

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = srcW
  cropCanvas.height = srcH
  const cropCtx = cropCanvas.getContext('2d')!

  cropCtx.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH)

  return cropCanvas.toDataURL('image/png')
}
