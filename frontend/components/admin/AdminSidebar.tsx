'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiHome, FiUsers, FiBriefcase, FiFileText, FiShield, FiSettings, FiLock, FiActivity } from 'react-icons/fi'

export default function AdminSidebar() {
  const pathname = usePathname()

  const menuItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: FiHome },
    { href: '/admin/institutions', label: 'Institutions', icon: FiBriefcase },
    { href: '/admin/users', label: 'Users', icon: FiUsers },
    { href: '/admin/documents', label: 'Documents', icon: FiFileText },
    { href: '/admin/api-keys', label: 'API Keys', icon: FiLock },
    { href: '/admin/logs', label: 'System Logs', icon: FiActivity },
    { href: '/admin/security', label: 'Security', icon: FiShield },
    { href: '/admin/settings', label: 'Settings', icon: FiSettings },
  ]

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen sticky top-16">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          // Safety check: ensure Icon is valid
          if (!Icon) {
            console.error(`Icon is undefined for menu item: ${item.label}`)
            return null
          }
          
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

