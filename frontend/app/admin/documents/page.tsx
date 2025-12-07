'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { getDashboardRoute } from '@/utils/roleRedirect'
import Header from '@/components/Header'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { FiFileText } from 'react-icons/fi'

export default function AdminDocumentsPage() {
  const router = useRouter()
  const { user, token, loading } = useAuth()

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
      return
    }
    if (user && user.role !== 'admin') {
      router.push(getDashboardRoute(user.role || 'user'))
    }
  }, [loading, token, user, router])

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Documents</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">View and manage all system documents</p>
          </div>
          <div className="text-center py-12">
            <FiFileText className="text-gray-300 dark:text-gray-700 text-6xl mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Document management page coming soon</p>
          </div>
        </main>
      </div>
    </div>
  )
}

