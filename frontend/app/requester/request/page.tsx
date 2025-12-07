'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { getDashboardRoute } from '@/utils/roleRedirect'
import Header from '@/components/Header'
import RequesterSidebar from '@/components/requester/RequesterSidebar'
import { FiSearch, FiFileText } from 'react-icons/fi'
import axios from 'axios'

export default function RequestDocumentPage() {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const [documentId, setDocumentId] = useState('')
  const [purpose, setPurpose] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
      return
    }
    if (user && user.role !== 'requester') {
      router.push(getDashboardRoute(user.role || 'user'))
    }
  }, [loading, token, user, router])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      // Search for documents by user email or NIN
      const response = await axios.get(
        `http://localhost:5000/api/documents?search=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSearchResults(response.data.documents || [])
    } catch (error: any) {
      console.error('Search error:', error)
    }
  }

  const handleRequest = async (docId: string) => {
    if (!purpose.trim()) {
      setError('Please enter a purpose for the request')
      return
    }

    setRequesting(true)
    setError('')

    try {
      await axios.post(
        'http://localhost:5000/api/requester/documents/request',
        {
          documentId: docId,
          purpose: purpose,
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setSuccess(true)
      setDocumentId('')
      setPurpose('')
      setExpiresInDays('')
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create request')
    } finally {
      setRequesting(false)
    }
  }

  if (loading || !user || user.role !== 'requester') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <div className="flex flex-1">
        <RequesterSidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Request Document Access</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Request access to user documents for verification</p>
          </div>

          <div className="max-w-4xl space-y-6">
            {/* Request Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Request Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Purpose of Request *
                  </label>
                  <textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Explain why you need access to this document..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Access Expires In (Days, Optional)
                  </label>
                  <input
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    placeholder="Leave empty for no expiration"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Document Search */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Find Document</h2>
              
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <FiSearch className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by document name, user email, or NIN..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  Search
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map((doc: any) => (
                    <div
                      key={doc._id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{doc.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Type: {doc.type} • Owner: {doc.userId?.name || 'Unknown'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRequest(doc._id)}
                        disabled={requesting || !purpose.trim()}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                      >
                        Request Access
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
                Request created successfully! Waiting for user approval.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

