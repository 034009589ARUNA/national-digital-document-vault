'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiHome, FiFileText, FiCheckCircle, FiSettings, FiActivity } from 'react-icons/fi'

export default function RequesterSidebar() {
  const pathname = usePathname()

  const menuItems = [
    { href: '/requester/dashboard', label: 'Dashboard', icon: FiHome },
    { href: '/requester/request', label: 'Request Access', icon: FiFileText },
    { href: '/requester/requests', label: 'My Requests', icon: FiFileText },
    { href: '/requester/verify', label: 'Verify Documents', icon: FiCheckCircle },
    { href: '/requester/logs', label: 'Activity Logs', icon: FiActivity },
    { href: '/requester/profile', label: 'Profile', icon: FiSettings },
  ]

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen sticky top-16">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="text-xl" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

