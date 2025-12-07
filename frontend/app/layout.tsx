import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import RoutePrefetcher from '@/components/RoutePrefetcher'
import { AuthProvider } from '@/app/context/AuthContext'
import { ThemeProvider } from '@/app/context/ThemeContext'

const inter = Inter({ subsets: ['latin'] })

// Get base URL from environment variable or use localhost for development
const metadataBase = process.env.NEXT_PUBLIC_APP_URL 
  ? new URL(process.env.NEXT_PUBLIC_APP_URL)
  : new URL('http://localhost:3000')

export const metadata: Metadata = {
  metadataBase,
  title: 'Sierra Vault - Digital Document Vault',
  description: 'Secure blockchain-verified digital vault for Sierra Leone citizens',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Sierra Vault - Digital Document Vault',
    description: 'Secure blockchain-verified digital vault for Sierra Leone citizens',
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sierra Vault - Digital Document Vault',
    description: 'Secure blockchain-verified digital vault for Sierra Leone citizens',
    images: ['/logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <RoutePrefetcher />
            <Navbar />
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

