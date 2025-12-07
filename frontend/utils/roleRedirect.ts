/**
 * Get the appropriate dashboard route based on user role
 */
export const getDashboardRoute = (role?: string): string => {
  switch (role) {
    case 'admin':
      return '/admin/dashboard'
    case 'issuer':
      return '/issuer/dashboard'
    case 'requester':
      return '/requester/dashboard'
    case 'auditor':
      return '/auditor/dashboard'
    case 'user':
    default:
      return '/dashboard'
  }
}

/**
 * Check if user has required role
 */
export const hasRole = (userRole?: string, requiredRoles: string[]): boolean => {
  if (!userRole) return false
  return requiredRoles.includes(userRole)
}

/**
 * Check if user is admin
 */
export const isAdmin = (userRole?: string): boolean => {
  return userRole === 'admin'
}

/**
 * Check if user is institution (issuer, requester, or auditor)
 */
export const isInstitution = (userRole?: string): boolean => {
  return ['issuer', 'requester', 'auditor'].includes(userRole || '')
}

