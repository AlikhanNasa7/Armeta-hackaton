'use client'

export default function DocumentPage() {
  return (
    <div className="flex-1 flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20">
          <span className="text-3xl">📄</span>
        </div>
        <h2 className="text-xl font-semibold text-white">Select a document</h2>
        <p className="mt-2 text-sm text-white/60">
          Choose a document from the sidebar to view its details
        </p>
      </div>
    </div>
  )
}
