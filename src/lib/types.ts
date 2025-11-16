export type DetectionType = 'signature' | 'stamp' | 'qrcode'

export interface DetectionBox {
  id: string
  type: DetectionType
  page: number
  x: number
  y: number
  width: number
  height: number
  /**
   * When 'normalized', the coordinates are 0–1 relative to page size.
   * When 'absolute', the coordinates are in PDF pixel units and need to be
   * divided by the actual page width/height to get normalized values.
   */
  coordinateSpace?: 'normalized' | 'absolute'
  pageWidth?: number
  pageHeight?: number
  payload?: Record<string, unknown>
}

export interface DocumentSummary {
  id: string
  title: string
  createdAt: string
}

export interface DocumentDetail extends DocumentSummary {
  fileUrl: string
  detections: DetectionBox[]
  shortSummary?: string
  sessionId?: string
}

export interface SessionFilteredFile {
  id: string
  filename: string
  fileUrl: string
  pages: number[]
}
