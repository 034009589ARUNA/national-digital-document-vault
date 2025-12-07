'use client'

interface VerificationBadgeProps {
  status: 'verified' | 'pending' | 'unverified'
}

export default function VerificationBadge({ status }: VerificationBadgeProps) {
  const badges = {
    verified: {
      bg: 'bg-green-100 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-300',
      label: '✓ Verified'
    },
    pending: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      text: 'text-yellow-700 dark:text-yellow-300',
      label: '⏳ Pending'
    },
    unverified: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      label: '○ Unverified'
    }
  }

  const badge = badges[status]

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
      {badge.label}
    </span>
  )
}
