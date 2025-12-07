'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// All routes in the application
const ALL_ROUTES = [
  // Public routes
  '/',
  '/login',
  '/register',
  '/test-connection',
  
  // Dashboard routes
  '/dashboard',
  '/dashboard/documents',
  '/dashboard/uploaded',
  '/dashboard/shared',
  '/dashboard/issued',
  '/dashboard/folders',
  '/dashboard/trash',
  '/dashboard/notifications',
  '/dashboard/activity',
  '/dashboard/profile',
  '/dashboard/settings',
  
  // Admin routes
  '/admin/dashboard',
  '/admin/users',
  '/admin/institutions',
  '/admin/documents',
  '/admin/logs',
  '/admin/api-keys',
  '/admin/security',
  '/admin/settings',
  
  // Issuer routes
  '/issuer/dashboard',
  '/issuer/issue',
  
  // Requester routes
  '/requester/dashboard',
  '/requester/request',
  
  // Auditor routes
  '/auditor/dashboard',
]

/**
 * RoutePrefetcher component
 * 
 * Pre-compiles all routes when the app loads using multiple strategies:
 * 1. Hidden Link components (Next.js automatically prefetches these)
 * 2. Router.prefetch() calls for additional coverage
 * 
 * This ensures all pages are compiled immediately, making navigation instant.
 */
export default function RoutePrefetcher() {
  const router = useRouter()

  useEffect(() => {
    // Use router.prefetch() as an additional method
    // This works alongside the Link prefetching below
    const prefetchWithRouter = async () => {
      console.log('🚀 Pre-compiling all routes for instant navigation...')
      const startTime = performance.now()
      
      // Prefetch all routes
      ALL_ROUTES.forEach((route, index) => {
        setTimeout(() => {
          try {
            router.prefetch(route)
          } catch (error) {
            // Silently fail - some routes might require auth
            console.debug(`Prefetch skipped for ${route}`)
          }
        }, index * 20) // Stagger by 20ms
      })
      
      // Log completion after a delay
      setTimeout(() => {
        const endTime = performance.now()
        const duration = ((endTime - startTime) / 1000).toFixed(2)
        console.log(`✅ Pre-compilation initiated for ${ALL_ROUTES.length} routes`)
        console.log('💡 Routes will compile in background - navigation will be instant!')
      }, 100)
    }

    // Start prefetching after initial render
    const timeoutId = setTimeout(prefetchWithRouter, 300)

    return () => clearTimeout(timeoutId)
  }, [router])

  // Hidden Link components - Next.js automatically prefetches these
  // This is the most reliable method for prefetching
  return (
    <div 
      style={{ 
        position: 'absolute', 
        left: '-9999px', 
        visibility: 'hidden',
        pointerEvents: 'none',
        width: 0,
        height: 0,
        overflow: 'hidden'
      }} 
      aria-hidden="true"
    >
      {ALL_ROUTES.map((route) => (
        <Link
          key={route}
          href={route}
          prefetch={true}
          style={{ display: 'none' }}
        >
          {/* Hidden link - Next.js will prefetch this route automatically */}
        </Link>
      ))}
    </div>
  )
}

