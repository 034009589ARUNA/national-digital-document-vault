'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { getDashboardRoute } from '@/utils/roleRedirect'
import Header from '@/components/Header'
import AuditorSidebar from '@/components/auditor/AuditorSidebar'
import DashboardCard from '@/components/DashboardCard'
import { FiShield, FiAlertTriangle, FiActivity, FiXCircle } from 'react-icons/fi'
import axios from 'axios'

export default function AuditorDashboard() {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
      return
    }
    if (user && user.role !== 'auditor') {
      router.push(getDashboardRoute(user.role || 'user'))
    }
  }, [loading, token, user, router])

  useEffect(() => {
    if (token && user?.role === 'auditor') {
      fetchStats()
    }
  }, [token, user])

  const fetchStats = async () => {
    try {
      setLoadingStats(true)
      const response = await axios.get(
        'http://localhost:5000/api/auditor/stats',
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

  if (loading || !user || user.role !== 'auditor') {
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
        <AuditorSidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Auditor Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Monitor system security and compliance</p>
          </div>

          {loadingStats ? (
            <p className="text-gray-600 dark:text-gray-400">Loading statistics...</p>
          ) : stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <DashboardCard
                title="Total Logs"
                value={stats.logs?.total || 0}
                icon={<FiActivity />}
                color="blue"
              />
              <DashboardCard
                title="Suspicious (7d)"
                value={stats.logs?.suspicious7d || 0}
                icon={<FiAlertTriangle />}
                color="red"
              />
              <DashboardCard
                title="Suspicious (30d)"
                value={stats.logs?.suspicious30d || 0}
                icon={<FiAlertTriangle />}
                color="orange"
              />
              <DashboardCard
                title="Failed Logins (7d)"
                value={stats.security?.failedLogins7d || 0}
                icon={<FiXCircle />}
                color="red"
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

