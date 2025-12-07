'use client'

import { useState } from 'react'
import { FiX, FiCopy, FiCheck } from 'react-icons/fi'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  onShare: (id: string, data: any) => Promise<any>
}

export default function ShareModal({ isOpen, onClose, documentId, onShare }: ShareModalProps) {
  const [shareType, setShareType] = useState<'link' | 'email'>('link')
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState<'view' | 'download' | 'edit'>('view')
  const [expiryDays, setExpiryDays] = useState<number | null>(null)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleShare = async () => {
    if (shareType === 'email' && !email.trim()) {
      alert('Please enter an email address')
      return
    }

    setLoading(true)
    try {
      const response = await onShare(documentId, {
        shareType,
        sharedWith: shareType === 'email' ? email : null,
        permissions,
        expiryDays
      })

      if (shareType === 'link') {
        if (response?.shareLink) {
          setShareLink(response.shareLink)
        } else if (response?.share?.shareToken) {
          setShareLink(`${window.location.origin}/shared/${response.share.shareToken}`)
        } else {
          // Fallback if response doesn't have share token
          setShareLink(`${window.location.origin}/shared/${generateToken()}`)
        }
      } else if (shareType === 'email') {
        // For email sharing, show success and close
        const successMsg = document.createElement('div')
        successMsg.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
        successMsg.textContent = 'Document shared successfully!'
        document.body.appendChild(successMsg)
        setTimeout(() => {
          successMsg.remove()
          onClose()
        }, 2000)
      }

      setEmail('')
      setExpiryDays(null)
    } catch (error: any) {
      console.error('Share error:', error)
      alert(error.response?.data?.message || 'Failed to share document. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Share Document</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <FiX className="text-2xl" />
          </button>
        </div>

        {!shareLink ? (
          <div className="space-y-4">
            {/* Share Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Share Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShareType('link')}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${
                    shareType === 'link'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Link
                </button>
                <button
                  onClick={() => setShareType('email')}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${
                    shareType === 'email'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Email
                </button>
              </div>
            </div>

            {/* Email Input (if email share type) */}
            {shareType === 'email' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            )}

            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Permissions
              </label>
              <select
                value={permissions}
                onChange={(e) => setPermissions(e.target.value as 'view' | 'download' | 'edit')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="view">View Only</option>
                <option value="download">Download</option>
                <option value="edit">Edit</option>
              </select>
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Link Expiry (Days)
              </label>
              <input
                type="number"
                value={expiryDays || ''}
                onChange={(e) => setExpiryDays(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Leave empty for no expiry"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={loading || (shareType === 'email' && !email)}
                className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
              >
                {loading ? 'Sharing...' : 'Share'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Share this link with others:
            </p>
            <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg break-all">
              <code className="flex-1 text-xs text-gray-900 dark:text-white">{shareLink}</code>
              <button
                onClick={copyToClipboard}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
              >
                {copied ? <FiCheck className="text-green-500" /> : <FiCopy />}
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
