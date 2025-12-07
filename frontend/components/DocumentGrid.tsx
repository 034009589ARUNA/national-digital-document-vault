'use client'

import { useState, memo } from 'react'
import { FiGrid, FiList, FiHeart, FiMoreVertical } from 'react-icons/fi'
import VerificationBadge from './VerificationBadge'

interface Document {
  _id: string
  name: string
  type: string
  fileSize: number
  uploadDate: string
  verificationStatus: string
  isFavorite: boolean
  accessCount: number
}

interface DocumentGridProps {
  documents: Document[]
  onDocumentClick: (doc: Document) => void
  onToggleFavorite: (id: string) => void
  onDelete: (id: string) => void
  favoritingId?: string | null
}

const DocumentGrid = memo(function DocumentGrid({
  documents,
  onDocumentClick,
  onToggleFavorite,
  onDelete,
  favoritingId
}: DocumentGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">No documents found</p>
      </div>
    )
  }

  return (
    <div>
      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('grid')}
          className={`p-2 rounded-lg transition ${
            viewMode === 'grid'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <FiGrid className="text-lg" />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-2 rounded-lg transition ${
            viewMode === 'list'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <FiList className="text-lg" />
        </button>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc._id}
              onClick={() => onDocumentClick(doc)}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-primary-400 dark:hover:border-primary-600 transition cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate flex-1">{doc.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleFavorite(doc._id)
                  }}
                  disabled={favoritingId === doc._id}
                  className="text-gray-400 hover:text-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {favoritingId === doc._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                  ) : (
                    <FiHeart className={`text-lg ${doc.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  )}
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{doc.type}</span>
                  <VerificationBadge status={doc.verificationStatus as any} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {(doc.fileSize / 1024).toFixed(2)} KB
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {new Date(doc.uploadDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc._id}
              onClick={() => onDocumentClick(doc)}
              className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer flex items-center justify-between group"
            >
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{doc.name}</h3>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-600 dark:text-gray-400">
                  <span className="capitalize">{doc.type}</span>
                  <span>{(doc.fileSize / 1024).toFixed(2)} KB</span>
                  <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <VerificationBadge status={doc.verificationStatus as any} />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleFavorite(doc._id)
                  }}
                  disabled={favoritingId === doc._id}
                  className="text-gray-400 hover:text-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {favoritingId === doc._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                  ) : (
                    <FiHeart className={`text-lg ${doc.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

export default DocumentGrid
