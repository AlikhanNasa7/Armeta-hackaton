'use client'

import { useCallback, useState } from 'react'
import { DEFAULT_DOCUMENT_ID, SAMPLE_DOCUMENT_SUMMARIES } from './mockData'
import { DocumentSummary } from './types'

export function useDocumentHistory() {
  const [history, setHistory] = useState<DocumentSummary[]>(
    SAMPLE_DOCUMENT_SUMMARIES
  )

  const addDocument = useCallback((doc: DocumentSummary) => {
    setHistory((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === doc.id)
      if (existingIndex !== -1) {
        const updated = [...prev]
        updated[existingIndex] = doc
        return updated
      }
      return [...prev, doc]
    })
  }, [])

  return { history, addDocument, isReady: true, defaultId: DEFAULT_DOCUMENT_ID }
}
