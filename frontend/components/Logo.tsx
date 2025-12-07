'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { FiShield } from 'react-icons/fi'

interface LogoProps {
  showText?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  href?: string
  variant?: 'default' | 'hero' | 'minimal'
}

export default function Logo({ 
  showText = true, 
  size = 'md',
  className = '',
  href,
  variant = 'default'
}: LogoProps) {
  const [imageError, setImageError] = useState(false)

  // Professional sizing - significantly larger
  const sizeClasses = {
    sm: 'w-12 h-12',      // 48px - was 32px
    md: 'w-16 h-16',      // 64px - was 40px
    lg: 'w-24 h-24',     // 96px - was 64px
    xl: 'w-32 h-32'      // 128px - new extra large
  }

  const textSizeClasses = {
    sm: 'text-xl font-bold tracking-tight',
    md: 'text-2xl font-bold tracking-tight',
    lg: 'text-3xl font-bold tracking-tight',
    xl: 'text-4xl font-bold tracking-tight'
  }

  const iconSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-5xl',
    xl: 'text-6xl'
  }

  // Professional spacing between logo and text
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-5',
    xl: 'gap-6'
  }

  // Variant-specific styling
  const variantStyles = {
    default: 'drop-shadow-md',
    hero: 'drop-shadow-xl',
    minimal: 'drop-shadow-sm'
  }

  const logoContent = (
    <div className={`flex items-center ${gapClasses[size]} ${className} group`}>
      <div className={`${sizeClasses[size]} relative flex-shrink-0 flex items-center justify-center 
        ${variantStyles[variant]}
        transition-all duration-300
        ${href ? 'group-hover:scale-105' : ''}
        logo-container
      `}>
        {!imageError ? (
          <Image
            src="/logo.png"
            alt="Sierra Vault Logo"
            fill
            className="object-contain logo-image"
            priority
            quality={100}
            sizes="(max-width: 768px) 64px, (max-width: 1200px) 96px, 128px"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`${iconSizes[size]} text-primary-600 drop-shadow-md`}>
            <FiShield />
          </div>
        )}
      </div>
      {showText && (
        <span className={`
          ${textSizeClasses[size]}
          text-gray-900 dark:text-white
          ${variant === 'hero' ? 'drop-shadow-lg' : ''}
          transition-all duration-300
          ${href ? 'group-hover:text-primary-600 dark:group-hover:text-primary-400' : ''}
          logo-text
        `}>
          Sierra Vault
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link 
        href={href} 
        className="inline-block hover:opacity-90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg"
        aria-label="Sierra Vault Home"
      >
        {logoContent}
      </Link>
    )
  }

  return logoContent
}

