'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { getDashboardRoute } from '@/utils/roleRedirect'
import Header from '@/components/Header'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { FiPlus, FiCheckCircle, FiXCircle, FiPause, FiTrash2, FiKey, FiSearch, FiBriefcase } from 'react-icons/fi'
import axios from 'axios'

export default function AdminInstitutionsPage() {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const [institutions, setInstitutions] = useState([])
  const [loadingInstitutions, setLoadingInstitutions] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState({ type: 'all', status: 'all' })
  const [searchQuery, setSearchQuery] = useState('')

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
      fetchInstitutions()
    }
  }, [token, user, filter])

  const fetchInstitutions = async () => {
    try {
      setLoadingInstitutions(true)
      const params = new URLSearchParams()
      if (filter.type !== 'all') params.append('type', filter.type)
      if (filter.status !== 'all') params.append('status', filter.status)
      
      const response = await axios.get(
        `http://localhost:5000/api/admin/institutions?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      let filtered = response.data.institutions || []
      
      if (searchQuery) {
        filtered = filtered.filter((inst: any) =>
          inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inst.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      
      setInstitutions(filtered)
    } catch (error: any) {
      console.error('Fetch institutions error:', error)
    } finally {
      setLoadingInstitutions(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await axios.put(
        `http://localhost:5000/api/admin/institutions/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchInstitutions()
      alert('Institution approved successfully')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve institution')
    }
  }

  const handleSuspend = async (id: string) => {
    const reason = prompt('Enter suspension reason:')
    if (!reason) return

    try {
      await axios.put(
        `http://localhost:5000/api/admin/institutions/${id}/suspend`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchInstitutions()
      alert('Institution suspended successfully')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to suspend institution')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this institution?')) return

    try {
      await axios.delete(
        `http://localhost:5000/api/admin/institutions/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchInstitutions()
      alert('Institution deleted successfully')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete institution')
    }
  }

  const handleGenerateAPIKey = async (id: string) => {
    const expiresInDays = prompt('Enter expiration days (leave empty for no expiration):')
    try {
      const response = await axios.post(
        `http://localhost:5000/api/admin/institutions/${id}/api-key`,
        { expiresInDays: expiresInDays ? parseInt(expiresInDays) : null },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert(`API Key generated: ${response.data.apiKey}\n\nSave this key - it will not be shown again!`)
      fetchInstitutions()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to generate API key')
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Institutions</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Manage all institutions</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              <FiPlus className="text-lg" />
              Create Institution
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search institutions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="issuer">Issuer</option>
              <option value="requester">Requester</option>
              <option value="auditor">Auditor</option>
            </select>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Institutions List */}
          {loadingInstitutions ? (
            <p className="text-gray-600 dark:text-gray-400">Loading institutions...</p>
          ) : institutions.length === 0 ? (
            <div className="text-center py-12">
              <FiBriefcase className="text-gray-300 dark:text-gray-700 text-6xl mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No institutions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {institutions.map((inst: any) => (
                <div
                  key={inst._id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{inst.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          inst.status === 'approved' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                          inst.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                          inst.status === 'suspended' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {inst.status}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {inst.type}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-2">{inst.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Email: {inst.contactEmail}</span>
                        {inst.contactPhone && <span>Phone: {inst.contactPhone}</span>}
                        {inst.website && <span>Website: {inst.website}</span>}
                      </div>
                      {inst.apiKey && (
                        <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                          <FiKey className="inline mr-1" />
                          API Key configured
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      {inst.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(inst._id)}
                          className="p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition"
                          title="Approve"
                        >
                          <FiCheckCircle className="text-lg" />
                        </button>
                      )}
                      {inst.status !== 'suspended' && (
                        <button
                          onClick={() => handleSuspend(inst._id)}
                          className="p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 transition"
                          title="Suspend"
                        >
                          <FiPause className="text-lg" />
                        </button>
                      )}
                      {inst.status === 'approved' && !inst.apiKey && (
                        <button
                          onClick={() => handleGenerateAPIKey(inst._id)}
                          className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                          title="Generate API Key"
                        >
                          <FiKey className="text-lg" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(inst._id)}
                        className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition"
                        title="Delete"
                      >
                        <FiTrash2 className="text-lg" />
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

