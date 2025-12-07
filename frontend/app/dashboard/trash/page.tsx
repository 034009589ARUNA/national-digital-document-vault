'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import { FiRotateCcw, FiTrash2 } from 'react-icons/fi'
import axios from 'axios'

export default function TrashPage() {
  const router = useRouter()
  const { token, loading } = useAuth()
  const [trashedDocs, setTrashedDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
    }
  }, [loading, token, router])

  useEffect(() => {
    if (token) {
      fetchTrashedDocuments()
    }
  }, [token])

  const fetchTrashedDocuments = async () => {
    try {
      setLoadingDocs(true)
      const response = await axios.get(
        'http://localhost:5000/api/documents/trash/list',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTrashedDocs(response.data || [])
    } catch (error: any) {
      console.error('Fetch trashed documents error:', error)
      if (error.response?.status === 401) {
        router.push('/login')
      }
    } finally {
      setLoadingDocs(false)
    }
  }

  const handleRestoreDocument = async (id: string) => {
    try {
      await axios.put(
        `http://localhost:5000/api/documents/${id}/restore`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchTrashedDocuments()
      
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
      successMsg.textContent = 'Document restored successfully!'
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)
    } catch (error: any) {
      console.error('Restore error:', error)
      alert(error.response?.data?.message || 'Failed to restore document')
    }
  }

  const handlePermanentlyDelete = async (id: string) => {
    if (!confirm('This action cannot be undone. Permanently delete this document?')) return

    try {
      await axios.delete(
        `http://localhost:5000/api/documents/${id}/permanent`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchTrashedDocuments()
      
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
      successMsg.textContent = 'Document permanently deleted'
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)
    } catch (error: any) {
      console.error('Delete error:', error)
      alert(error.response?.data?.message || 'Failed to delete document')
    }
  }

  const handleRestoreSelected = async () => {
    if (selectedDocs.length === 0) return

    try {
      await Promise.all(
        selectedDocs.map(id =>
          axios.put(
            `http://localhost:5000/api/documents/${id}/restore`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      )
      setSelectedDocs([])
      fetchTrashedDocuments()
      
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
      successMsg.textContent = `${selectedDocs.length} document(s) restored successfully!`
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)
    } catch (error: any) {
      console.error('Restore error:', error)
      alert(error.response?.data?.message || 'Failed to restore documents')
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trash</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Deleted documents are permanently removed after 30 days
              </p>
            </div>
            {selectedDocs.length > 0 && (
              <button
                onClick={handleRestoreSelected}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
              >
                <FiRotateCcw className="text-lg" />
                Restore Selected ({selectedDocs.length})
              </button>
            )}
          </div>

          {/* Trashed Documents */}
          {loadingDocs ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          ) : trashedDocs.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <FiTrash2 className="text-gray-300 dark:text-gray-700 text-6xl mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">Your trash is empty</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                Deleted documents will appear here for 30 days
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trashedDocs.map((doc) => (
                <div
                  key={doc._id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
                >
                  <label className="flex items-center gap-3 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(doc._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDocs([...selectedDocs, doc._id])
                        } else {
                          setSelectedDocs(selectedDocs.filter(id => id !== doc._id))
                        }
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{doc.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-600 dark:text-gray-400">
                        <span className="capitalize">{doc.type}</span>
                        <span>{(doc.fileSize / 1024).toFixed(2)} KB</span>
                        <span>Deleted: {new Date(doc.deletedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestoreDocument(doc._id)}
                      className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                      title="Restore"
                    >
                      <FiRotateCcw className="text-lg" />
                    </button>
                    <button
                      onClick={() => handlePermanentlyDelete(doc._id)}
                      className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition"
                      title="Permanently delete"
                    >
                      <FiTrash2 className="text-lg" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
