'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import DocumentGrid from '@/components/DocumentGrid'
import DocumentPreviewModal from '@/components/DocumentPreviewModal'
import { FiUpload } from 'react-icons/fi'
import axios from 'axios'

export default function UploadedDocumentsPage() {
  const router = useRouter()
  const { token, loading } = useAuth()
  const [documents, setDocuments] = useState([])
  const [filteredDocuments, setFilteredDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
    }
  }, [loading, token, router])

  useEffect(() => {
    if (token) {
      fetchDocuments()
    }
  }, [token])

  useEffect(() => {
    let filtered = documents.filter(doc => !doc.isIssued)
    
    if (searchQuery) {
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.type === typeFilter)
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.verificationStatus === statusFilter)
    }
    
    setFilteredDocuments(filtered)
  }, [documents, searchQuery, typeFilter, statusFilter])

  const fetchDocuments = async () => {
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

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      await axios.delete(
        `http://localhost:5000/api/documents/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPreviewOpen(false)
      fetchDocuments()
    } catch (error: any) {
      console.error('Delete error:', error)
      alert(error.response?.data?.message || 'Failed to delete document')
    }
  }

  const handleToggleFavorite = async (id: string) => {
    try {
      await axios.put(
        `http://localhost:5000/api/documents/${id}/favorite`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchDocuments()
    } catch (error: any) {
      console.error('Favorite toggle error:', error)
      // Silently fail for favorite toggle - not critical
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      setUploading(true)
      const uploadPromises = Array.from(files).map(file => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'other')

        return axios.post(
          'http://localhost:5000/api/documents/upload',
          formData,
          {
            headers: { Authorization: `Bearer ${token}` },
            'Content-Type': 'multipart/form-data'
          }
        )
      })

      await Promise.all(uploadPromises)
      fetchDocuments()
      
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
      successMsg.textContent = `${files.length} document(s) uploaded successfully!`
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)
    } catch (error: any) {
      console.error('Upload error:', error)
      const errorMsg = document.createElement('div')
      errorMsg.className = 'fixed top-20 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
      errorMsg.textContent = error.response?.data?.message || 'Failed to upload documents'
      document.body.appendChild(errorMsg)
      setTimeout(() => errorMsg.remove(), 3000)
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Uploaded Documents</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Documents you have uploaded</p>
            </div>
            <label className="mt-4 md:mt-0 flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition cursor-pointer">
              <FiUpload className="text-lg" />
              Upload More
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
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
              <option value="other">Other</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="unverified">Unverified</option>
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
              <FiUpload className="text-gray-300 dark:text-gray-700 text-6xl mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No uploaded documents found</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
                {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters' 
                  : 'Upload your first document to get started'}
              </p>
            </div>
          ) : (
            <DocumentGrid
              documents={filteredDocuments}
              onDocumentClick={handleDocumentClick}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDeleteDocument}
            />
          )}
        </main>
      </div>

      {/* Preview Modal */}
      <DocumentPreviewModal
        document={selectedDocument}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownload}
        onDelete={handleDeleteDocument}
        onShare={handleShare}
      />
    </div>
  )
}
