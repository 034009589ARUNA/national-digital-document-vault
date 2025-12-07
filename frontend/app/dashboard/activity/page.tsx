'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import { FiUpload, FiDownload, FiShare2, FiTrash2, FiCheck, FiEye, FiFolder, FiFileText, FiClock } from 'react-icons/fi'
import axios from 'axios'

export default function ActivityLogsPage() {
  const router = useRouter()
  const { token, loading } = useAuth()
  const [logs, setLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
    }
  }, [loading, token, router])

  useEffect(() => {
    if (token) {
      fetchActivityLogs()
    }
  }, [token, filter, page])

  const fetchActivityLogs = async () => {
    try {
      setLoadingLogs(true)
      const response = await axios.get(
        `http://localhost:5000/api/user/activity-logs?page=${page}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      let filteredLogs = response.data.logs || []
      
      if (filter !== 'all') {
        filteredLogs = filteredLogs.filter((log: any) => log.action === filter)
      }
      
      setLogs(filteredLogs)
      setTotalPages(response.data.pagination?.pages || 1)
    } catch (error: any) {
      console.error('Fetch activity logs error:', error)
      if (error.response?.status === 401) {
        router.push('/login')
      }
    } finally {
      setLoadingLogs(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload':
        return <FiUpload className="text-blue-600 dark:text-blue-400" />
      case 'download':
        return <FiDownload className="text-green-600 dark:text-green-400" />
      case 'share':
        return <FiShare2 className="text-purple-600 dark:text-purple-400" />
      case 'delete':
        return <FiTrash2 className="text-red-600 dark:text-red-400" />
      case 'restore':
        return <FiCheck className="text-emerald-600 dark:text-emerald-400" />
      case 'verify':
        return <FiCheck className="text-yellow-600 dark:text-yellow-400" />
      case 'view':
        return <FiEye className="text-gray-600 dark:text-gray-400" />
      case 'folder-create':
        return <FiFolder className="text-orange-600 dark:text-orange-400" />
      case 'folder-delete':
        return <FiFolder className="text-red-600 dark:text-red-400" />
      default:
        return <FiFileText className="text-gray-600 dark:text-gray-400" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'upload':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
      case 'download':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
      case 'share':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
      case 'delete':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
      case 'restore':
        return 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
      case 'verify':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Activity Logs</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Track all your document activities</p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {['all', 'upload', 'download', 'share', 'delete', 'restore', 'verify', 'view'].map((action) => (
              <button
                key={action}
                onClick={() => {
                  setFilter(action)
                  setPage(1)
                }}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  filter === action
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {action.charAt(0).toUpperCase() + action.slice(1)}
              </button>
            ))}
          </div>

          {/* Activity Logs List */}
          {loadingLogs ? (
            <div className="flex items-center justify-center py-12">
              <FiClock className="text-gray-400 animate-spin text-2xl" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <FiFileText className="text-gray-300 dark:text-gray-700 text-6xl mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No activity logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log: any) => (
                <div
                  key={log._id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                            {log.action.replace('-', ' ')} {log.resourceType}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {log.resourceName}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {formatDate(log.createdAt)}
                          </p>
                        </div>
                      </div>
                      {log.details && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

