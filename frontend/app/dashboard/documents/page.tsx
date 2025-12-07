'use client'

import { useEffect, useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import DocumentGrid from '@/components/DocumentGrid'
import { FiUpload, FiSearch, FiFileText } from 'react-icons/fi'
import axios from 'axios'

// Lazy load heavy modal components
const DocumentPreviewModal = lazy(() => import('@/components/DocumentPreviewModal'))
const DocumentUpload = lazy(() => import('@/components/DocumentUpload'))

export default function DocumentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { token, loading } = useAuth()
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [favoritingId, setFavoritingId] = useState<string | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      setLoadingDocs(true)
      const response = await axios.get(
        'http://localhost:5000/api/documents',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setDocuments(response.data.documents || response.data || [])
    } catch (error: any) {
      console.error('Fetch documents error:', error)
      if (error.response?.status === 401) {
        router.push('/login')
      }
    } finally {
      setLoadingDocs(false)
    }
  }, [token, router])

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
    }
  }, [loading, token, router])

  useEffect(() => {
    if (token) {
      fetchDocuments()
    }
  }, [token, fetchDocuments])

  useEffect(() => {
    // Check if upload query parameter is present
    const uploadParam = searchParams.get('upload')
    if (uploadParam === 'true') {
      setUploadOpen(true)
      // Remove query parameter from URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }

    // Get search query from URL if present
    const urlSearch = searchParams.get('search')
    if (urlSearch && !searchQuery) {
      setSearchQuery(urlSearch)
    }
  }, [searchParams])

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Optimize filtering with useMemo
  const filteredDocuments = useMemo(() => {
    let filtered = documents
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(query) ||
        (doc.description && doc.description.toLowerCase().includes(query))
      )
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.type === typeFilter)
    }
    return filtered
  }, [documents, debouncedSearchQuery, typeFilter])

  const handleDocumentClick = (doc: any) => {
    setSelectedDocument(doc)
    setPreviewOpen(true)
  }

  const handleDownload = async (id: string) => {
    try {
      setDownloadingId(id)
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
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      setDeletingId(id)
      await axios.delete(
        `http://localhost:5000/api/documents/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPreviewOpen(false)
      fetchDocuments()
    } catch (error: any) {
      console.error('Delete error:', error)
      alert(error.response?.data?.message || 'Failed to delete document')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleFavorite = async (id: string) => {
    try {
      setFavoritingId(id)
      await axios.put(
        `http://localhost:5000/api/documents/${id}/favorite`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchDocuments()
    } catch (error) {
      console.error('Favorite toggle error:', error)
    } finally {
      setFavoritingId(null)
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
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Documents</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage all your uploaded documents</p>
            </div>
            <button
              onClick={() => setUploadOpen(true)}
              className="mt-4 md:mt-0 flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              <FiUpload className="text-lg" />
              Upload Document
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="birth-certificate">Birth Certificate</option>
              <option value="passport">Passport</option>
              <option value="driver-license">Driver License</option>
              <option value="degree">Degree</option>
              <option value="contract">Contract</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Documents Grid */}
          {loadingDocs ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FiFileText className="text-gray-300 dark:text-gray-700 text-6xl mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No documents found</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
                {searchQuery || typeFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Upload your first document to get started'}
              </p>
              {!searchQuery && typeFilter === 'all' && (
                <button
                  onClick={() => setUploadOpen(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                >
                  Upload Document
                </button>
              )}
            </div>
          ) : (
            <DocumentGrid
              documents={filteredDocuments}
              onDocumentClick={handleDocumentClick}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDeleteDocument}
              favoritingId={favoritingId}
            />
          )}
        </main>
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <Suspense fallback={null}>
          <DocumentPreviewModal
            document={selectedDocument}
            isOpen={previewOpen}
            onClose={() => setPreviewOpen(false)}
            onDownload={handleDownload}
            onDelete={handleDeleteDocument}
            onShare={handleShare}
            downloading={downloadingId === selectedDocument?._id}
            deleting={deletingId === selectedDocument?._id}
          />
        </Suspense>
      )}

      {/* Upload Modal */}
      {uploadOpen && (
        <Suspense fallback={null}>
          <DocumentUpload
            onClose={() => setUploadOpen(false)}
            onUploaded={() => {
              fetchDocuments()
              setUploadOpen(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
