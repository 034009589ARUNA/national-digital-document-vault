'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import { FiBell, FiTrash2, FiCheck } from 'react-icons/fi'
import axios from 'axios'

export default function NotificationsPage() {
  const router = useRouter()
  const { token, loading } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [loadingDocs, setLoadingDocs] = useState(true)

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
    }
  }, [loading, token, router])

  useEffect(() => {
    if (token) {
      fetchNotifications()
    }
  }, [token])

  const fetchNotifications = async () => {
    try {
      setLoadingDocs(true)
      const response = await axios.get(
        'http://localhost:5000/api/notifications',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNotifications(response.data.notifications || [])
    } catch (error: any) {
      console.error('Fetch notifications error:', error)
      if (error.response?.status === 401) {
        router.push('/login')
      }
    } finally {
      setLoadingDocs(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await axios.put(
        `http://localhost:5000/api/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchNotifications()
    } catch (error) {
      console.error('Mark as read error:', error)
    }
  }

  const handleDeleteNotification = async (id: string) => {
    try {
      await axios.delete(
        `http://localhost:5000/api/notifications/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchNotifications()
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await axios.put(
        'http://localhost:5000/api/notifications/read/all',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchNotifications()
    } catch (error) {
      console.error('Mark all as read error:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document-shared':
        return '📤'
      case 'document-verified':
        return '✓'
      case 'document-issued':
        return '📝'
      case 'share-request':
        return '🔗'
      default:
        return '📢'
    }
  }

  const filteredNotifications = filterType === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filterType)

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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Stay updated on your documents</p>
            </div>
            {notifications.some(n => !n.isRead) && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
              >
                <FiCheck className="text-lg" />
                Mark All as Read
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {['all', 'document-shared', 'document-verified', 'document-issued', 'system'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  filterType === type
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {type.replace('-', ' ').charAt(0).toUpperCase() + type.replace('-', ' ').slice(1)}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          {loadingDocs ? (
            <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <FiBell className="text-gray-300 dark:text-gray-700 text-6xl mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 rounded-lg border transition ${
                    notification.isRead
                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {notification.message}
                      </p>
                      <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification._id)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                          title="Mark as read"
                        >
                          <FiCheck className="text-lg" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNotification(notification._id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition"
                        title="Delete"
                      >
                        <FiTrash2 className="text-lg text-red-600 dark:text-red-400" />
                      </button>
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
