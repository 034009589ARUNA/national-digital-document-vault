'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { getDashboardRoute } from '@/utils/roleRedirect'
import Header from '@/components/Header'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { FiSearch, FiPause, FiPlay, FiTrash2 } from 'react-icons/fi'
import axios from 'axios'

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [filter, setFilter] = useState({ role: 'all', isActive: 'all' })
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
      fetchUsers()
    }
  }, [token, user, filter])

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const params = new URLSearchParams()
      if (filter.role !== 'all') params.append('role', filter.role)
      if (filter.isActive !== 'all') params.append('isActive', filter.isActive)
      if (searchQuery) params.append('search', searchQuery)
      
      const response = await axios.get(
        `http://localhost:5000/api/admin/users?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setUsers(response.data.users || [])
    } catch (error: any) {
      console.error('Fetch users error:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSuspend = async (id: string) => {
    const reason = prompt('Enter suspension reason:')
    if (!reason) return

    try {
      await axios.put(
        `http://localhost:5000/api/admin/users/${id}/suspend`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchUsers()
      alert('User suspended successfully')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to suspend user')
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await axios.put(
        `http://localhost:5000/api/admin/users/${id}/restore`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchUsers()
      alert('User restored successfully')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to restore user')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      await axios.delete(
        `http://localhost:5000/api/admin/users/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchUsers()
      alert('User deleted successfully')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete user')
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Users</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage all system users</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setTimeout(() => fetchUsers(), 500)
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={filter.role}
              onChange={(e) => setFilter({ ...filter, role: e.target.value })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="issuer">Issuer</option>
              <option value="requester">Requester</option>
              <option value="auditor">Auditor</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={filter.isActive}
              onChange={(e) => setFilter({ ...filter, isActive: e.target.value })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Suspended</option>
            </select>
          </div>

          {/* Users List */}
          {loadingUsers ? (
            <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">No users found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((u: any) => (
                <div
                  key={u._id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{u.name}</h3>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {u.role}
                      </span>
                      {!u.isActive && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {u.email} • NIN: {u.nin}
                    </p>
                    {u.institutionId && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Institution: {u.institutionId.name}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {u.isActive ? (
                      <button
                        onClick={() => handleSuspend(u._id)}
                        className="p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 transition"
                        title="Suspend"
                      >
                        <FiPause className="text-lg" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRestore(u._id)}
                        className="p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition"
                        title="Restore"
                      >
                        <FiPlay className="text-lg" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(u._id)}
                      className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition"
                      title="Delete"
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

