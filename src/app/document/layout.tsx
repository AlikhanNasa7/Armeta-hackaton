'use client'

import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'

const DocumentLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProtectedRoute>
      <div className="flex w-full h-full">
        <Sidebar />
        {children}
      </div>
    </ProtectedRoute>
  )
}

export default DocumentLayout
