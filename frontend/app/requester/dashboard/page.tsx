'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { getDashboardRoute } from '@/utils/roleRedirect'
import Header from '@/components/Header'
import RequesterSidebar from '@/components/requester/RequesterSidebar'
import DashboardCard from '@/components/DashboardCard'
import { FiFileText, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import axios from 'axios'

export default function RequesterDashboard() {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
      return
    }
    if (user && user.role !== 'requester') {
      router.push(getDashboardRoute(user.role || 'user'))
    }
  }, [loading, token, user, router])

  useEffect(() => {
    if (token && user?.role === 'requester') {
      fetchData()
    }
  }, [token, user])

  const fetchData = async () => {
    try {
      setLoadingData(true)
      const [statsRes, profileRes] = await Promise.all([
        axios.get('http://localhost:5000/api/requester/stats', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/requester/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      setStats(statsRes.data)
      setInstitution(profileRes.data)
    } catch (error: any) {
      console.error('Fetch data error:', error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        router.push('/login')
      }
    } finally {
      setLoadingData(false)
    }
  }

  if (loading || !user || user.role !== 'requester') {
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
        <RequesterSidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Requester Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {institution?.name || 'Request and verify documents'}
            </p>
          </div>

          {loadingData ? (
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          ) : stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <DashboardCard
                title="Total Requests"
                value={stats.requests?.total || 0}
                icon={<FiFileText />}
                color="blue"
              />
              <DashboardCard
                title="Pending"
                value={stats.requests?.pending || 0}
                icon={<FiClock />}
                color="yellow"
              />
              <DashboardCard
                title="Approved"
                value={stats.requests?.approved || 0}
                icon={<FiCheckCircle />}
                color="green"
              />
              <DashboardCard
                title="Verified"
                value={stats.verifications?.verified || 0}
                icon={<FiCheckCircle />}
                color="purple"
              />
            </div>
          )}

          {institution && institution.status !== 'approved' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 dark:text-yellow-300">
                Your institution is {institution.status}. Please wait for admin approval.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

