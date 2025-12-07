'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { getDashboardRoute } from '@/utils/roleRedirect'
import Header from '@/components/Header'
import AdminSidebar from '@/components/admin/AdminSidebar'
import DashboardCard from '@/components/DashboardCard'
import { FiUsers, FiBriefcase, FiFileText, FiShield, FiAlertTriangle, FiCheckCircle, FiX, FiClock } from 'react-icons/fi'
import axios from 'axios'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
      return
    }
    
    // Redirect non-admin users
    if (user && user.role && user.role !== 'admin') {
      const correctRoute = getDashboardRoute(user.role)
      router.push(correctRoute)
    }
  }, [loading, token, user, router])

  useEffect(() => {
    if (token && user?.role === 'admin') {
      fetchStats()
    }
  }, [token, user])

  const fetchStats = async () => {
    try {
      setLoadingStats(true)
      const response = await axios.get(
        'http://localhost:5000/api/admin/stats',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setStats(response.data)
    } catch (error: any) {
      console.error('Fetch stats error:', error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        router.push('/login')
      }
    } finally {
      setLoadingStats(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">System overview and management</p>
          </div>

          {loadingStats ? (
            <p className="text-gray-600 dark:text-gray-400">Loading statistics...</p>
          ) : stats ? (
            <>
              {/* Users Stats */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Users</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <DashboardCard
                    title="Total Users"
                    value={stats.users?.total || 0}
                    icon={React.createElement(FiUsers)}
                    color="blue"
                  />
                  <DashboardCard
                    title="Active Users"
                    value={stats.users?.active || 0}
                    icon={React.createElement(FiCheckCircle)}
                    color="green"
                  />
                  <DashboardCard
                    title="Suspended Users"
                    value={stats.users?.suspended || 0}
                    icon={React.createElement(FiX)}
                    color="red"
                  />
                </div>
              </div>

                {/* Institutions Stats */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Institutions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <DashboardCard
                      title="Total Institutions"
                      value={stats.institutions?.total || 0}
                      icon={React.createElement(FiBriefcase)}
                      color="blue"
                    />
                    <DashboardCard
                      title="Pending Approval"
                      value={stats.institutions?.pending || 0}
                      icon={React.createElement(FiClock)}
                      color="yellow"
                    />
                    <DashboardCard
                      title="Approved"
                      value={stats.institutions?.approved || 0}
                      icon={React.createElement(FiCheckCircle)}
                      color="green"
                    />
                    <DashboardCard
                      title="Suspended"
                      value={stats.institutions?.suspended || 0}
                      icon={React.createElement(FiX)}
                      color="red"
                    />
                  </div>
                </div>

                {/* Documents Stats */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Documents</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DashboardCard
                      title="Total Documents"
                      value={stats.documents?.total || 0}
                      icon={React.createElement(FiFileText)}
                      color="blue"
                    />
                    <DashboardCard
                      title="Issued Documents"
                      value={stats.documents?.issued || 0}
                      icon={React.createElement(FiCheckCircle)}
                      color="green"
                    />
                  </div>
                </div>

                {/* Security Stats */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Security</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DashboardCard
                      title="Total Logs"
                      value={stats.security?.totalLogs || 0}
                      icon={React.createElement(FiShield)}
                      color="blue"
                    />
                    <DashboardCard
                      title="Suspicious (7 days)"
                      value={stats.security?.suspiciousLogs || 0}
                      icon={React.createElement(FiAlertTriangle)}
                      color="red"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No statistics available</p>
              </div>
            )}
          </main>
        </div>
      </div>
    )
}

