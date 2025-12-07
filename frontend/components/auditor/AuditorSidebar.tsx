'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiHome, FiActivity, FiAlertTriangle, FiShield, FiBarChart } from 'react-icons/fi'

export default function AuditorSidebar() {
  const pathname = usePathname()

  const menuItems = [
    { href: '/auditor/dashboard', label: 'Dashboard', icon: FiHome },
    { href: '/auditor/logs', label: 'System Logs', icon: FiActivity },
    { href: '/auditor/suspicious', label: 'Suspicious Activity', icon: FiAlertTriangle },
    { href: '/auditor/compliance', label: 'Compliance', icon: FiBarChart },
    { href: '/auditor/security', label: 'Security Events', icon: FiShield },
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

