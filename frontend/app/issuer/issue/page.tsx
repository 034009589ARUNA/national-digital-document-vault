'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { getDashboardRoute } from '@/utils/roleRedirect'
import Header from '@/components/Header'
import IssuerSidebar from '@/components/issuer/IssuerSidebar'
import { FiUpload, FiX, FiFile, FiCheckCircle } from 'react-icons/fi'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'

export default function IssueDocumentPage() {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [userId, setUserId] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [description, setDescription] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
      return
    }
    if (user && user.role !== 'issuer') {
      router.push(getDashboardRoute(user.role || 'user'))
    }
  }, [loading, token, user, router])

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setError('')
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }
    if (!userId) {
      setError('Please enter user ID or email')
      return
    }
    if (!documentType) {
      setError('Please select a document type')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)
      formData.append('type', documentType)
      if (description) formData.append('description', description)
      if (expiryDate) formData.append('expiryDate', expiryDate)

      await axios.post('http://localhost:5000/api/issuer/documents/issue', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setFile(null)
        setUserId('')
        setDocumentType('')
        setDescription('')
        setExpiryDate('')
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to issue document')
    } finally {
      setUploading(false)
    }
  }

  const documentTypes = [
    { label: 'Birth Certificate', value: 'birth-certificate' },
    { label: 'Passport', value: 'passport' },
    { label: 'Driver License', value: 'driver-license' },
    { label: 'Degree', value: 'degree' },
    { label: 'Property Deed', value: 'property-deed' },
    { label: 'Contract', value: 'contract' },
    { label: 'Other', value: 'other' }
  ]

  if (loading || !user || user.role !== 'issuer') {
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
        <IssuerSidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Issue Document</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Issue official documents to users</p>
          </div>

          <div className="max-w-3xl">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 space-y-6">
              {success ? (
                <div className="text-center py-8">
                  <FiCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Document Issued Successfully!</h3>
                  <p className="text-gray-600 dark:text-gray-400">The document has been issued and verified.</p>
                </div>
              ) : (
                <>
                  {/* User ID/Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      User ID or Email
                    </label>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="Enter user ID or email"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Document Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Document Type
                    </label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select document type</option>
                      {documentTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Document description"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Document File (PDF or Image, max 10MB)
                    </label>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        isDragActive
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
                      }`}
                    >
                      <input {...getInputProps()} />
                      {file ? (
                        <div className="flex items-center justify-center space-x-3">
                          <FiFile className="text-primary-600 dark:text-primary-400 text-2xl" />
                          <div className="text-left">
                            <p className="font-semibold text-gray-900 dark:text-white">{file.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <FiUpload className="text-gray-400 dark:text-gray-500 text-4xl mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400 mb-2">
                            {isDragActive ? 'Drop the file here' : 'Drag & drop a file here, or click to select'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Supports PDF, PNG, JPG (max 10MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={uploading || !file || !userId || !documentType}
                    className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Issuing Document...' : 'Issue Document'}
                  </button>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

