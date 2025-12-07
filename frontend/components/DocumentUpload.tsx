'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/app/context/AuthContext'
import axios from 'axios'
import { FiUpload, FiX, FiFile, FiCheckCircle } from 'react-icons/fi'

interface DocumentUploadProps {
  onClose: () => void
  onUploaded: () => void
}

export default function DocumentUpload({ onClose, onUploaded }: DocumentUploadProps) {
  const { token } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setError('')
    }
  }, [])

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

    if (!documentType) {
      setError('Please select a document type')
      return
    }

    setUploading(true)
    setError('')

    if (!token) {
      setError('You must be logged in to upload documents')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', documentType)

      const response = await axios.post('http://localhost:5000/api/documents/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      setSuccess(true)
      setTimeout(() => {
        onUploaded()
        onClose()
      }, 1500)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Upload failed. Please try again.'
      setError(errorMessage)
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  // Document types mapped to backend enum values
  const documentTypes = [
    { label: 'Birth Certificate', value: 'birth-certificate' },
    { label: 'Passport', value: 'passport' },
    { label: 'Driver License', value: 'driver-license' },
    { label: 'Property Deed', value: 'property-deed' },
    { label: 'Degree', value: 'degree' },
    { label: 'Contract', value: 'contract' },
    { label: 'Invoice', value: 'invoice' },
    { label: 'Other', value: 'other' }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Document</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <FiX className="text-2xl" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {success ? (
            <div className="text-center py-8">
              <FiCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Upload Successful!</h3>
              <p className="text-gray-600 dark:text-gray-400">Your document has been verified and stored securely.</p>
            </div>
          ) : (
            <>
              {/* Document Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select document type</option>
                  {documentTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload File (PDF or Image, max 10MB)
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
                        {isDragActive
                          ? 'Drop the file here'
                          : 'Drag & drop a file here, or click to select'}
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

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={uploading || !file || !documentType || !token}
                  className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    'Upload & Verify'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

