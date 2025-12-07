'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { getDashboardRoute } from '@/utils/roleRedirect'
import Header from '@/components/Header'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { FiSearch, FiAlertTriangle, FiInfo, FiAlertCircle } from 'react-icons/fi'
import axios from 'axios'
// Date formatting helper
const formatDate = (date: string) => {
  const d = new Date(date)
  return d.toLocaleString()
}

const timeAgo = (date: string) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'Just now'
}

export default function AdminLogsPage() {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const [logs, setLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [filter, setFilter] = useState({ action: 'all', severity: 'all', isSuspicious: 'all' })
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
      return
    }
    if (user && user.role !== 'admin') {
      router.push(getDashboardRoute(user.role || 'user'))
    }
  }, [loading, token, user, router])

  useEffect(() => {
    if (token && user?.role === 'admin') {
      fetchLogs()
    }
  }, [token, user, filter, currentPage])

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true)
      const params = new URLSearchParams()
      if (filter.action !== 'all') params.append('action', filter.action)
      if (filter.severity !== 'all') params.append('severity', filter.severity)
      if (filter.isSuspicious !== 'all') params.append('isSuspicious', filter.isSuspicious)
      params.append('page', currentPage.toString())
      params.append('limit', '50')
      
      const response = await axios.get(
        `http://localhost:5000/api/admin/logs?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setLogs(response.data.logs || [])
    } catch (error: any) {
      console.error('Fetch logs error:', error)
    } finally {
      setLoadingLogs(false)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <FiAlertTriangle className="text-red-500" />
      case 'error':
        return <FiAlertCircle className="text-red-400" />
      case 'warning':
        return <FiAlertTriangle className="text-yellow-500" />
      default:
        return <FiInfo className="text-blue-500" />
    }
  }

  if (loading || !user || user.role !== 'admin') {
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
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Logs</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Monitor all system activities</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <select
              value={filter.action}
              onChange={(e) => {
                setFilter({ ...filter, action: e.target.value })
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Actions</option>
              <option value="login">Login</option>
              <option value="document-issue">Document Issue</option>
              <option value="access-request">Access Request</option>
              <option value="failed-login">Failed Login</option>
              <option value="unauthorized-access">Unauthorized Access</option>
            </select>
            <select
              value={filter.severity}
              onChange={(e) => {
                setFilter({ ...filter, severity: e.target.value })
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={filter.isSuspicious}
              onChange={(e) => {
                setFilter({ ...filter, isSuspicious: e.target.value })
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All</option>
              <option value="true">Suspicious Only</option>
              <option value="false">Normal Only</option>
            </select>
          </div>

          {/* Logs List */}
          {loadingLogs ? (
            <p className="text-gray-600 dark:text-gray-400">Loading logs...</p>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">No logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log: any) => (
                <div
                  key={log._id}
                  className={`bg-white dark:bg-gray-800 rounded-lg p-4 border ${
                    log.isSuspicious
                      ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl mt-1">
                      {getSeverityIcon(log.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {log.action}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {log.resourceType}
                        </span>
                        {log.isSuspicious && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                            Suspicious
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {log.resourceName}
                      </p>
                      {log.userId && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          User: {log.userId.name} ({log.userId.email})
                        </p>
                      )}
                      {log.institutionId && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Institution: {log.institutionId.name}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {formatDate(log.createdAt)} ({timeAgo(log.createdAt)})
                      </p>
                    </div>
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

