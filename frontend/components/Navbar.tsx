'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import Logo from './Logo'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, token, logout } = useAuth()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    setIsAuthenticated(!!token)
  }, [token, pathname])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50 border-b border-gray-100 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Logo href="/" size="md" variant="default" />

          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className={`text-gray-700 hover:text-primary-600 transition-colors ${
                    pathname === '/dashboard' ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`text-gray-700 hover:text-primary-600 transition-colors ${
                    pathname === '/login' ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

