'use client'

import { useState, useEffect } from 'react'
import { FiX, FiDownload, FiShare2, FiTrash2, FiPrinter, FiFile, FiImage } from 'react-icons/fi'
import VerificationBadge from './VerificationBadge'
import ShareModal from './ShareModal'
import { useAuth } from '@/app/context/AuthContext'

interface DocumentPreviewModalProps {
  document: any
  isOpen: boolean
  onClose: () => void
  onDownload: (id: string) => void
  onDelete: (id: string) => void
  onShare: (id: string, data: any) => Promise<any>
  downloading?: boolean
  deleting?: boolean
}

export default function DocumentPreviewModal({
  document,
  isOpen,
  onClose,
  onDownload,
  onDelete,
  onShare,
  downloading = false,
  deleting = false
}: DocumentPreviewModalProps) {
  const { token } = useAuth()
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    if (isOpen && document && token) {
      loadPreview()
    } else {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
    }
  }, [isOpen, document, token])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const loadPreview = async () => {
    if (!document || !token) return
    
    try {
      setLoadingPreview(true)
      // For PDFs and images, we can create a preview URL
      const isImage = document.mimeType?.startsWith('image/')
      const isPdf = document.mimeType === 'application/pdf'
      
      if (isImage || isPdf) {
        const response = await fetch(
          `http://localhost:5000/api/documents/${document._id}/download`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
      }
    } catch (error) {
      console.error('Load preview error:', error)
    } finally {
      setLoadingPreview(false)
    }
  }

  if (!isOpen || !document) return null

  const handlePrint = () => {
    if (previewUrl) {
      const printWindow = window.open(previewUrl, '_blank')
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }
    } else {
      window.print()
    }
  }

  const isImage = document.mimeType?.startsWith('image/')
  const isPdf = document.mimeType === 'application/pdf'
  const canPreview = isImage || isPdf

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{document.name}</h2>
              <div className="flex items-center gap-4 mt-2">
                <VerificationBadge status={document.verificationStatus || 'unverified'} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(document.uploadDate).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <FiX className="text-2xl" />
            </button>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {canPreview && (
              <div className="mb-6">
                {loadingPreview ? (
                  <div className="flex flex-col items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading preview...</p>
                  </div>
                ) : previewUrl ? (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {isImage ? (
                      <img
                        src={previewUrl}
                        alt={document.name}
                        className="w-full h-auto max-h-96 object-contain"
                      />
                    ) : isPdf ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-96"
                        title={document.name}
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div className="text-center">
                      <FiFile className="text-6xl text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">Preview not available</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Document Type</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{document.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">File Size</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {(document.fileSize / 1024).toFixed(2)} KB
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Uploaded</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {new Date(document.uploadDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Access Count</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{document.accessCount || 0}</p>
              </div>
            </div>

            {document.description && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">Description</p>
                <p className="text-gray-900 dark:text-white">{document.description}</p>
              </div>
            )}

            {document.blockchainHash && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Blockchain Hash</p>
                <p className="font-mono text-xs text-gray-900 dark:text-white break-all">{document.blockchainHash}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
            <button
              onClick={() => onDownload(document._id)}
              disabled={downloading || deleting}
              className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <FiDownload className="text-lg" />
                  Download
                </>
              )}
            </button>
            <button
              onClick={() => setShareModalOpen(true)}
              disabled={downloading || deleting}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiShare2 className="text-lg" />
              Share
            </button>
            <button
              onClick={handlePrint}
              disabled={downloading || deleting}
              className="flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiPrinter className="text-lg" />
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this document?')) {
                  onDelete(document._id)
                  onClose()
                }
              }}
              disabled={downloading || deleting}
              className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                </>
              ) : (
                <FiTrash2 className="text-lg" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        documentId={document._id}
        onShare={onShare}
      />
    </>
  )
}
