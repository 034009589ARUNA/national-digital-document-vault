'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import DocumentGrid from '@/components/DocumentGrid'
import DocumentPreviewModal from '@/components/DocumentPreviewModal'
import VerificationBadge from '@/components/VerificationBadge'
import { FiDownload, FiCheckCircle } from 'react-icons/fi'
import axios from 'axios'

export default function IssuedDocumentsPage() {
  const router = useRouter()
  const { token, loading } = useAuth()
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [loadingDocs, setLoadingDocs] = useState(true)

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
    }
  }, [loading, token, router])

  useEffect(() => {
    if (token) {
      fetchIssuedDocuments()
    }
  }, [token])

  const fetchIssuedDocuments = async () => {
    try {
      setLoadingDocs(true)
      const response = await axios.get(
        'http://localhost:5000/api/documents/issued/list',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setDocuments(response.data || [])
    } catch (error: any) {
      console.error('Fetch issued documents error:', error)
      if (error.response?.status === 401) {
        router.push('/login')
      }
    } finally {
      setLoadingDocs(false)
    }
  }

  const handleDocumentClick = (doc: any) => {
    setSelectedDocument(doc)
    setPreviewOpen(true)
  }

  const handleDownload = async (id: string) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/documents/${id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      )
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', selectedDocument?.name || 'document')
      document.body.appendChild(link)
      link.click()
      link.parentElement?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Download error:', error)
      alert(error.response?.data?.message || 'Failed to download document')
    }
  }

  const handleShare = async (id: string, data: any) => {
    try {
      const response = await axios.post(
        'http://localhost:5000/api/sharing/share',
        { documentId: id, ...data },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      return response.data
    } catch (error) {
      console.error('Share error:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Issued Documents</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Read-only verified documents issued to you
            </p>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-blue-900 dark:text-blue-300 text-sm">
              These documents have been verified and issued by official authorities. They cannot be modified but can be shared or downloaded for your records.
            </p>
          </div>

          {/* Documents List */}
          <div className="mt-8">
            {loadingDocs ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <FiCheckCircle className="text-gray-300 dark:text-gray-700 text-6xl mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No issued documents yet</p>
                <p className="text-gray-500 dark:text-gray-500 text-sm">
                  Documents issued by authorities will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    onClick={() => handleDocumentClick(doc)}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{doc.name}</h3>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className="capitalize">{doc.type}</span>
                          <span>{new Date(doc.issuedAt).toLocaleDateString()}</span>
                          <span>Issued by {doc.issuedBy?.name || 'Authority'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <VerificationBadge status="verified" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(doc._id)
                          }}
                          className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                        >
                          <FiDownload className="text-lg" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Preview Modal */}
      <DocumentPreviewModal
        document={selectedDocument}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownload}
        onDelete={() => {}}
        onShare={handleShare}
      />
    </div>
  )
}
