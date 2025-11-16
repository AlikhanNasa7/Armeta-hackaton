import { DetectionType, DocumentDetail, SessionFilteredFile } from './types'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vparu.kz'
const FALLBACK_PAGE_WIDTH = 2480 // Approx A4 at 300 DPI
const FALLBACK_PAGE_HEIGHT = 3508

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

function normalizeDetectionType(type: string): DetectionType {
  if (!type) return 'signature'
  const lower = type.toLowerCase()
  if (lower.includes('qr')) {
    return 'qrcode'
  }
  if (lower.includes('stamp') || lower.includes('seal')) {
    return 'stamp'
  }
  if (lower.includes('sign')) {
    return 'signature'
  }
  return 'signature'
}

function getNumberValue(value: unknown): number | undefined {
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined
}

function extractPageDimensions(
  raw: Record<string, unknown>
): { width: number; height: number } | undefined {
  const width =
    getNumberValue(raw['page_width']) ||
    getNumberValue(raw['image_width']) ||
    getNumberValue(raw['pageWidth']) ||
    getNumberValue(raw['imageWidth'])
  const height =
    getNumberValue(raw['page_height']) ||
    getNumberValue(raw['image_height']) ||
    getNumberValue(raw['pageHeight']) ||
    getNumberValue(raw['imageHeight'])

  if (width && height) {
    return { width, height }
  }

  return undefined
}

function combineDetectionData(
  detection: BackendDetection
): Record<string, unknown> {
  const flattened: Record<string, unknown> = {
    ...(detection as Record<string, unknown>),
  }
  if (detection.data && typeof detection.data === 'object') {
    Object.assign(flattened, detection.data as Record<string, unknown>)
  }
  return flattened
}

export async function uploadDocument(data: {
  results: File[]
  sessionName?: string
}): Promise<{
  session_id: number
  results: Array<{ id: number; filename: string }>
}> {
  const { results, sessionName } = data
  console.log(results, 'results')
  console.log(sessionName, 'sessionName')

  const formData = new FormData()
  // Append each file to the FormData
  results.forEach((file) => {
    formData.append('files', file)
  })
  formData.append('session_name', sessionName || getSessionName())

  const response = await fetch(`${BACKEND_URL}/process-pdfs`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'ngrok-skip-browser-warning': 'true',
      Accept: 'application/json',
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }

  const result = await response.json()
  return result
}

// Backend detection format for signatures and stamps
interface BackendDetectionStandard {
  id: number
  file_id: number
  page: number
  type: 'signature' | 'stamp'
  data: {
    confidence: number
    bbox: {
      x1: number
      y1: number
      x2: number
      y2: number
      width: number
      height: number
    }
    page_width?: number
    page_height?: number
  }
}

// Backend detection format for QR codes
interface BackendDetectionQR {
  id: number
  file_id: number
  page: number
  type: 'qrcode'
  data: {
    id: number
    x: number // Top-left X coordinate
    y: number // Top-left Y coordinate
    width: number
    height: number
    data: string // QR code content (URL, etc.)
    corner_points: [
      [number, number],
      [number, number],
      [number, number],
      [number, number]
    ]
  }
}

type BackendDetection = BackendDetectionStandard | BackendDetectionQR

// Backend response format
interface BackendFileResponse {
  id: number
  session_id: number
  user_id: number
  key: string
  filename: string
  content_type: string
  size: number | null
  s3_url: string
  detections: BackendDetection[]
}

export async function fetchDocument(
  documentId: string
): Promise<DocumentDetail> {
  console.log('📄 Fetching document:', documentId)

  const response = await fetch(`${BACKEND_URL}/files/${documentId}`, {
    method: 'GET',
    credentials: 'include',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
  })

  console.log('Response status:', response.status, response.statusText)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Fetch document error:', errorText)
    throw new Error(
      `Failed to fetch document: ${response.statusText} - ${errorText}`
    )
  }

  const data: BackendFileResponse = await response.json()
  console.log('✅ Document data received:', data)

  const firstDetectionCombined = data.detections?.[0]
    ? combineDetectionData(data.detections[0])
    : undefined
  const documentDimensions = (firstDetectionCombined &&
    extractPageDimensions(firstDetectionCombined)) || {
    width: FALLBACK_PAGE_WIDTH,
    height: FALLBACK_PAGE_HEIGHT,
  }

  const pageDimensionCache = new Map<
    number,
    { width: number; height: number }
  >()
  for (const detection of data.detections || []) {
    const dims = extractPageDimensions(combineDetectionData(detection))
    if (dims) {
      pageDimensionCache.set(detection.page, dims)
    } else if (!pageDimensionCache.has(detection.page)) {
      pageDimensionCache.set(detection.page, documentDimensions)
    }
  }

  // Transform detections to our format
  const detections = (data.detections || []).map((detection, index) => {
    try {
      console.group(`🔍 Detection #${index + 1} (ID: ${detection.id})`)
      console.log('Type:', detection.type)
      console.log('Page:', detection.page)
      console.log('Raw data:', detection.data)
      const normalizedType = normalizeDetectionType(String(detection.type))
      const detectionData = detection.data as Record<string, unknown>
      const dimsFromData = extractPageDimensions(
        combineDetectionData(detection)
      )

      if (dimsFromData) {
        pageDimensionCache.set(detection.page, dimsFromData)
      }

      const cachedDims =
        pageDimensionCache.get(detection.page) || documentDimensions
      const pageWidth = cachedDims.width
      const pageHeight = cachedDims.height

      let normalized
      const hasBbox = 'bbox' in detectionData

      if (hasBbox) {
        const stdData = detectionData as {
          bbox: { x1: number; y1: number; width: number; height: number }
        }

        console.log('Standard bbox format:', stdData.bbox)
        console.log('Page dimensions:', { pageWidth, pageHeight })

        normalized = {
          id: String(detection.id),
          type: normalizedType,
          page: detection.page,
          coordinateSpace: 'normalized',
          pageWidth,
          pageHeight,
          x: stdData.bbox.x1 / pageWidth,
          y: stdData.bbox.y1 / pageHeight,
          width: stdData.bbox.width / pageWidth,
          height: stdData.bbox.height / pageHeight,
          payload:
            normalizedType === 'qrcode' &&
            typeof detectionData['data'] === 'string'
              ? { url: detectionData['data'] as string }
              : undefined,
        }
      } else {
        const directData = detectionData as {
          x?: number
          y?: number
          width?: number
          height?: number
          data?: unknown
        }

        console.log('Direct x,y format:', {
          x: directData.x,
          y: directData.y,
          width: directData.width,
          height: directData.height,
          pageWidth,
          pageHeight,
        })

        normalized = {
          id: String(detection.id),
          type: normalizedType,
          page: detection.page,
          coordinateSpace: 'normalized',
          pageWidth,
          pageHeight,
          x: (directData.x || 0) / pageWidth,
          y: (directData.y || 0) / pageHeight,
          width: (directData.width || 100) / pageWidth,
          height: (directData.height || 100) / pageHeight,
          payload:
            normalizedType === 'qrcode' && typeof directData.data === 'string'
              ? { url: directData.data }
              : undefined,
        }
      }

      console.log('Normalized (0-1):', {
        x: normalized.x.toFixed(4),
        y: normalized.y.toFixed(4),
        width: normalized.width.toFixed(4),
        height: normalized.height.toFixed(4),
      })
      console.groupEnd()

      return normalized
    } catch (error) {
      console.error('❌ Error transforming detection:', error)
      console.groupEnd()
      // Return a fallback to prevent the entire request from failing
      return {
        id: String(detection.id),
        type: normalizeDetectionType(String(detection.type)),
        page: detection.page,
        coordinateSpace: 'normalized',
        pageWidth: documentDimensions.width,
        pageHeight: documentDimensions.height,
        x: 0,
        y: 0,
        width: 0.1,
        height: 0.1,
      }
    }
  })

  return {
    id: String(data.id),
    title: data.filename,
    fileUrl: data.s3_url,
    detections,
    createdAt: new Date().toISOString(),
    shortSummary: (data as Record<string, unknown>)['short_summary'] as
      | string
      | undefined,
    sessionId: data.session_id ? String(data.session_id) : undefined,
  }
}

export interface Session {
  id: number
  name: string
  user_id: number
  created_at: string
  updated_at: string
  files: Array<{
    id: string
    filename: string
  }>
}

export async function fetchSessions(): Promise<Session[]> {
  const response = await fetch(`${BACKEND_URL}/sessions`, {
    method: 'GET',
    credentials: 'include',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`)
  }

  return await response.json()
}

export async function fetchFileSummary(fileId: string): Promise<{
  file_id: number
  filename: string
  analysis: string
}> {
  const response = await fetch(`${BACKEND_URL}/files/${fileId}/summary`, {
    method: 'GET',
    credentials: 'include',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch detailed summary: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

export interface SessionFilterParams {
  has_signature?: boolean
  has_stamp?: boolean
  has_qr?: boolean
}

export async function fetchSessionFiles(
  sessionId: string,
  filters: SessionFilterParams = {}
): Promise<SessionFilteredFile[]> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === 'boolean') {
      params.set(key, String(value))
    }
  })
  const query = params.toString()
  const url = `${BACKEND_URL}/files/session/${sessionId}${
    query ? `?${query}` : ''
  }`

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch session files: ${response.status} ${response.statusText}`
    )
  }

  const payload = await response.json()
  const files = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.files)
    ? payload.files
    : []

  type RawSessionFile = {
    id?: number | string
    file_id?: number | string
    filename?: string
    s3_url?: string
    fileUrl?: string
    url?: string
    pages?: number[]
    filtered_pages?: number[]
  }

  return files.map((file: RawSessionFile) => ({
    id: String(
      file.id ?? file.file_id ?? `file-${Date.now()}-${Math.random()}`
    ),
    filename: file.filename ?? 'Untitled document',
    fileUrl: file.s3_url ?? file.fileUrl ?? file.url ?? '',
    pages: Array.isArray(file.pages)
      ? file.pages
      : Array.isArray(file.filtered_pages)
      ? file.filtered_pages
      : [],
  }))
}

export async function updateSessionName(
  sessionId: number,
  name: string
): Promise<Session> {
  const response = await fetch(`${BACKEND_URL}/sessions/${sessionId}`, {
    method: 'PATCH',
    credentials: 'include',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    throw new Error(`Failed to update session: ${response.statusText}`)
  }

  return await response.json()
}

export async function uploadFileToSession(
  sessionId: number,
  file: File
): Promise<{ id: number; filename: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${BACKEND_URL}/files/upload/${sessionId}`, {
    method: 'POST',
    credentials: 'include',
    mode: 'cors',
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`)
  }

  return await response.json()
}
