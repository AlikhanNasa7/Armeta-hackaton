import { DocumentDetail, DocumentSummary } from './types'

const createdAt = '2024-12-12T12:00:00.000Z'

const demoDetections = [
  {
    id: 'sig-1',
    type: 'signature',
    page: 1,
    x: 0.16,
    y: 0.78,
    width: 0.28,
    height: 0.08,
  },
  {
    id: 'stamp-1',
    type: 'stamp',
    page: 1,
    x: 0.58,
    y: 0.52,
    width: 0.2,
    height: 0.14,
  },
  {
    id: 'qr-1',
    type: 'qrcode',
    page: 1,
    x: 0.72,
    y: 0.16,
    width: 0.12,
    height: 0.12,
  },
]

export const SAMPLE_DOCUMENTS: Record<string, DocumentDetail> = {
  'tu-document': {
    id: 'tu-document',
    title: 'ТУ-.pdf',
    createdAt,
    fileUrl: '/uploads/TU-document.pdf',
    detections: demoDetections,
  },
  'demo-contract': {
    id: 'demo-contract',
    title: 'Demo Contract.pdf',
    createdAt,
    fileUrl: '/sample.pdf',
    detections: demoDetections,
  },
}

export const SAMPLE_DOCUMENT_SUMMARIES: DocumentSummary[] = Object.values(
  SAMPLE_DOCUMENTS
).map(({ id, title, createdAt, fileUrl }) => ({
  id,
  title,
  createdAt,
  fileUrl,
}))

export const DEFAULT_DOCUMENT_ID = 'tu-document'
