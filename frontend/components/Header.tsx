'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { useTheme } from '@/app/context/ThemeContext'
import { FiMenu, FiX, FiSearch, FiBell, FiSettings, FiLogOut, FiHome, FiFileText, FiShare2, FiTrash2, FiUser, FiChevronDown, FiSun, FiMoon } from 'react-icons/fi'
import axios from 'axios'

export default function Header() {
  const router = useRouter()
  const { user, token, logout } = useAuth()
  const { effectiveTheme, setTheme, theme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [profileDropdown, setProfileDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (token) {
      fetchNotificationCount()
      // Poll for notifications every 30 seconds
      const interval = setInterval(fetchNotificationCount, 30000)
      return () => clearInterval(interval)
    }
  }, [token])

  const fetchNotificationCount = async () => {
    if (!token) return
    try {
      const response = await axios.get('http://localhost:5000/api/notifications/unread/count', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotificationCount(response.data.unreadCount)
    } catch (error) {
      console.error('Fetch notification count error:', error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dashboard/documents?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-auto">
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </form>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            onClick={() => {
              if (theme === 'light') {
                setTheme('dark')
              } else if (theme === 'dark') {
                setTheme('auto')
              } else {
                setTheme('light')
              }
            }}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            title={`Theme: ${theme === 'auto' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light'}`}
          >
            {effectiveTheme === 'dark' ? <FiSun className="text-2xl" /> : <FiMoon className="text-2xl" />}
          </button>

          {/* Notifications */}
          <button
            onClick={() => router.push('/dashboard/notifications')}
            className="relative text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
          >
            <FiBell className="text-2xl" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => router.push('/dashboard/settings')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
          >
            <FiSettings className="text-2xl" />
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdown(!profileDropdown)}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <img
                src={user?.profileImage ? `http://localhost:5000${user.profileImage}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=0284c7&color=fff&size=40`}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=0284c7&color=fff&size=40`
                }}
              />
              <FiChevronDown className="text-lg" />
            </button>

            {profileDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                <Link
                  href="/dashboard/profile"
                  className="px-4 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <FiUser className="text-lg" />
                  View Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="px-4 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <FiSettings className="text-lg" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <FiLogOut className="text-lg" />
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-gray-600 dark:text-gray-400"
          >
            {sidebarOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
          </button>
        </div>
      </div>
    </header>
  )
}
