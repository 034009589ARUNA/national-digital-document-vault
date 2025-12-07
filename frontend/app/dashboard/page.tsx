'use client'

import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { getDashboardRoute } from '@/utils/roleRedirect'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import DashboardCard from '@/components/DashboardCard'
import DocumentGrid from '@/components/DocumentGrid'
import { FiUpload, FiFolder, FiShare2, FiCheckCircle, FiFileText, FiHardDrive, FiActivity } from 'react-icons/fi'
import axios from 'axios'

// Lazy load heavy modal components
const DocumentPreviewModal = lazy(() => import('@/components/DocumentPreviewModal'))

export default function Dashboard() {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentDocuments, setRecentDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [favoritingId, setFavoritingId] = useState<string | null>(null)

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoadingStats(true)
      const response = await axios.get(
        'http://localhost:5000/api/documents/stats/overview',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setStats(response.data)
      setRecentDocuments(response.data.recentlyAccessed || [])
    } catch (error: any) {
      console.error('Fetch stats error:', error)
      if (error.response?.status === 401) {
        router.push('/login')
      }
    } finally {
      setLoadingStats(false)
    }
  }, [token, router])

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
      return
    }
    
    // Redirect non-user roles to their respective dashboards
    if (user && user.role && user.role !== 'user') {
      const correctRoute = getDashboardRoute(user.role)
      router.push(correctRoute)
    }
  }, [loading, token, user, router])

  useEffect(() => {
    if (token) {
      fetchDashboardStats()
    }
  }, [token, fetchDashboardStats])

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
      fetchDashboardStats()
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
      fetchDashboardStats()
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

  if (!user || !token) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back, {user.name}!</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Here's what's happening in your vault</p>
          </div>

          {/* Stats Cards */}
          {loadingStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <DashboardCard
                title="Total Documents"
                value={stats.totalDocuments}
                icon={<FiFileText />}
                color="blue"
              />
              <DashboardCard
                title="Issued Documents"
                value={stats.issuedDocuments}
                icon={<FiCheckCircle />}
                color="green"
              />
              <DashboardCard
                title="Uploaded Documents"
                value={stats.uploadedDocuments}
                icon={<FiUpload />}
                color="purple"
              />
              <DashboardCard
                title="Verified Documents"
                value={stats.verifiedDocuments}
                icon={<FiCheckCircle />}
                color="emerald"
              />
              <DashboardCard
                title="Shared with Me"
                value={stats.sharedWithMe || 0}
                icon={<FiShare2 />}
                color="indigo"
              />
              <DashboardCard
                title="Storage Used"
                value={`${(stats.storageUsed / (1024 * 1024)).toFixed(2)} MB`}
                icon={<FiHardDrive />}
                color="orange"
              />
              <DashboardCard
                title="In Trash"
                value={stats.trashCount}
                icon={<FiFolder />}
                color="red"
              />
            </div>
          ) : null}

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => router.push('/dashboard/documents?upload=true')}
                className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                <FiUpload className="text-lg" />
                Upload Document
              </button>
              <button
                onClick={() => router.push('/dashboard/folders?create=true')}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                <FiFolder className="text-lg" />
                Create Folder
              </button>
              <button
                onClick={() => router.push('/dashboard/shared')}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                <FiShare2 className="text-lg" />
                Shared with Me
              </button>
              <button
                onClick={() => router.push('/dashboard/documents?verify=true')}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                <FiCheckCircle className="text-lg" />
                Request Verification
              </button>
            </div>
          </div>

          {/* Recently Accessed */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recently Accessed</h2>
            {loadingStats ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Loading...</p>
              </div>
            ) : recentDocuments.length === 0 ? (
              <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <FiFileText className="text-gray-300 dark:text-gray-700 text-4xl mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">No recent documents</p>
              </div>
            ) : (
              <DocumentGrid
                documents={recentDocuments}
                onDocumentClick={handleDocumentClick}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDeleteDocument}
                favoritingId={favoritingId}
              />
            )}
          </div>
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
    </div>
  )
}

