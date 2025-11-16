'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { DetectionBox, DetectionType } from '@/lib/types'

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

type PdfWithOverlaysProps = {
  fileUrl: string
  detections: DetectionBox[]
  selectedDetectionId?: string | null
  onSelectDetection?: (id: string) => void
  zoom?: number
  currentPage?: number
  onPageCountChange?: (count: number) => void
  onResolvedPageChange?: (page: number) => void
}

const colorMap: Record<DetectionType, string> = {
  signature: 'border-red-500 bg-red-500/10 text-red-300',
  stamp: 'border-blue-500 bg-blue-500/10 text-blue-300',
  qrcode: 'border-green-500 bg-green-500/10 text-green-300',
}

export function PdfWithOverlays({
  fileUrl,
  detections,
  selectedDetectionId,
  onSelectDetection,
  zoom = 1,
  currentPage,
  onPageCountChange,
  onResolvedPageChange,
}: PdfWithOverlaysProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [baseWidth, setBaseWidth] = useState<number>(720)
  const detectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (!containerRef.current) return
    const handleResize = () => {
      if (!containerRef.current) return
      const { clientWidth, clientHeight } = containerRef.current
      const maxWidth = Math.min(clientWidth - 32, 1200)
      const maxHeight = Math.max(clientHeight - 32, 400)
      const widthFromHeight = (maxHeight / Math.SQRT2) * Math.sqrt(2)
      setBaseWidth(Math.max(Math.min(maxWidth, widthFromHeight), 480))
    }
    handleResize()
    const observer = new ResizeObserver(handleResize)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!selectedDetectionId) return
    const target = detectionRefs.current[selectedDetectionId]
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedDetectionId])

  const detectionsByPage = useMemo(() => {
    return detections.reduce<Record<number, DetectionBox[]>>((acc, item) => {
      acc[item.page] = acc[item.page] ? [...acc[item.page], item] : [item]
      return acc
    }, {})
  }, [detections])

  const resolvedPageNumber = useMemo(() => {
    const safeTotal = numPages || 1
    if (currentPage && currentPage > 0) {
      return Math.min(currentPage, safeTotal)
    }
    return 1
  }, [currentPage, numPages])

  useEffect(() => {
    onResolvedPageChange?.(resolvedPageNumber)
  }, [resolvedPageNumber, onResolvedPageChange])

  return (
    <div className="flex h-full flex-col items-center gap-6" ref={containerRef}>
      <Document
        file={fileUrl}
        loading={<div className="text-sm text-slate-400">Loading PDF…</div>}
        onLoadSuccess={({ numPages }) => {
          setNumPages(numPages)
          onPageCountChange?.(numPages)
        }}
        className="flex flex-col items-center gap-8"
      >
        {(() => {
          const currentWidth = baseWidth * zoom

          return (
            <div className="relative w-full rounded-2xl border border-white/10 bg-slate-900/60 p-3 shadow-2xl">
              <Page
                pageNumber={resolvedPageNumber}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                className="mx-auto overflow-hidden rounded-xl"
                width={currentWidth}
              />
              <div className="pointer-events-none absolute inset-3 rounded-xl">
                {detectionsByPage[resolvedPageNumber]?.map((box) => (
                  <div
                    key={box.id}
                    ref={(el) => {
                      detectionRefs.current[box.id] = el
                    }}
                    className={`pointer-events-auto absolute rounded-xl border-2 p-1 text-[10px] font-semibold uppercase tracking-wider transition ${
                      colorMap[box.type]
                    } ${
                      selectedDetectionId === box.id
                        ? 'shadow-[0_0_20px_rgba(34,211,238,0.7)] ring-4 ring-cyan-300/50'
                        : ''
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelectDetection?.(box.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelectDetection?.(box.id)
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      left: `${box.x * 100}%`,
                      top: `${box.y * 100}%`,
                      width: `${box.width * 100}%`,
                      height: `${box.height * 100}%`,
                    }}
                    title={`${box.type} (${box.x.toFixed(2)}, ${box.y.toFixed(
                      2
                    )})`}
                    data-detection-id={box.id}
                  >
                    <span className="rounded bg-black/40 px-1">
                      {box.type === 'qrcode'
                        ? 'QR'
                        : box.type.charAt(0).toUpperCase() + box.type.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </Document>
    </div>
  )
}
