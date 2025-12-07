'use client'

import React from 'react'

export interface DashboardCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'emerald' | 'orange' | 'red' | 'indigo' | 'yellow'
  trend?: { value: number; isPositive: boolean }
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-600 dark:text-blue-400'
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-600 dark:text-green-400'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-600 dark:text-purple-400'
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-600 dark:text-emerald-400'
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-600 dark:text-orange-400'
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-600 dark:text-red-400'
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-600 dark:text-indigo-400'
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-600 dark:text-yellow-400'
  }
}

export default function DashboardCard({ title, value, icon, color, trend }: DashboardCardProps) {
  // Safety check: ensure color is valid, default to blue if not
  const validColor = color && colorClasses[color] ? color : 'blue'
  const classes = colorClasses[validColor]
  
  // Safety check: ensure icon is valid
  if (!icon) {
    console.warn('DashboardCard: icon prop is missing')
  }
  
  return (
    <div className={`${classes.bg} ${classes.border} rounded-lg p-6 border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{title || 'N/A'}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value ?? 0}</p>
          {trend && (
            <p className={`text-xs mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className={`${classes.text} text-3xl`}>
          {icon || <span>📊</span>}
        </div>
      </div>
    </div>
  )
}
