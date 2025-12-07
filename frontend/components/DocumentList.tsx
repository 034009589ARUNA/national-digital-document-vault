'use client'

import { useState } from 'react'
import axios from 'axios'
import { useAuth } from '@/app/context/AuthContext'
import { FiFile, FiDownload, FiTrash2, FiCheckCircle, FiClock, FiEye } from 'react-icons/fi'

interface Document {
  _id: string
  name: string
  type: string
  uploadDate: string
  blockchainHash: string
  verified: boolean
  fileSize: number
}

interface DocumentListProps {
  documents: Document[]
  onRefresh: () => void
}

export default function DocumentList({ documents, onRefresh }: DocumentListProps) {
  const { token } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)

  const handleDownload = async (documentId: string, fileName: string) => {
    setLoading(documentId)
    try {
      const response = await axios.get(
        `http://localhost:5000/api/documents/${documentId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download document')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    setLoading(documentId)
    try {
      await axios.delete(`http://localhost:5000/api/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      onRefresh()
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete document')
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div
          key={doc._id}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className="bg-primary-100 p-3 rounded-lg">
                <FiFile className="text-primary-600 text-2xl" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{doc.name}</h3>
                  {doc.verified ? (
                    <span className="flex items-center space-x-1 text-green-600 text-sm">
                      <FiCheckCircle />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-yellow-600 text-sm">
                      <FiClock />
                      <span>Verifying</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span className="bg-gray-100 px-2 py-1 rounded">{doc.type}</span>
                  <span>{formatFileSize(doc.fileSize || 0)}</span>
                  <span>{formatDate(doc.uploadDate)}</span>
                  {doc.blockchainHash && (
                    <span className="font-mono text-xs bg-blue-50 px-2 py-1 rounded">
                      Hash: {doc.blockchainHash.substring(0, 16)}...
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => handleDownload(doc._id, doc.name)}
                disabled={loading === doc._id}
                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Download"
              >
                <FiDownload />
              </button>
              <button
                onClick={() => handleDelete(doc._id)}
                disabled={loading === doc._id}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

