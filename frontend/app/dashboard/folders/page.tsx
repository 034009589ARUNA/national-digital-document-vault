'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import { FiFolder, FiTrash2, FiEdit2, FiPlus } from 'react-icons/fi'
import axios from 'axios'

interface Folder {
  _id: string
  name: string
  description: string
  color: string
  createdAt: string
}

export default function FoldersPage() {
  const router = useRouter()
  const { token, loading } = useAuth()
  const [folders, setFolders] = useState<Folder[]>([])
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState('#3B82F6')
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
    }
  }, [loading, token, router])

  useEffect(() => {
    if (token) {
      fetchFolders()
    }
  }, [token])

  const fetchFolders = async () => {
    try {
      setLoadingFolders(true)
      const response = await axios.get(
        'http://localhost:5000/api/folders',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setFolders(response.data || [])
    } catch (error: any) {
      console.error('Fetch folders error:', error)
      if (error.response?.status === 401) {
        router.push('/login')
      }
    } finally {
      setLoadingFolders(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Please enter a folder name')
      return
    }

    try {
      await axios.post(
        'http://localhost:5000/api/folders',
        { name: newFolderName.trim(), color: newFolderColor },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNewFolderName('')
      setNewFolderColor('#3B82F6')
      setShowCreateForm(false)
      fetchFolders()
      
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
      successMsg.textContent = 'Folder created successfully!'
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)
    } catch (error: any) {
      console.error('Create folder error:', error)
      alert(error.response?.data?.message || 'Failed to create folder')
    }
  }

  const handleDeleteFolder = async (id: string) => {
    if (!confirm('Delete this folder and its contents?')) return

    try {
      await axios.delete(
        `http://localhost:5000/api/folders/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchFolders()
      
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
      successMsg.textContent = 'Folder deleted successfully!'
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)
    } catch (error: any) {
      console.error('Delete error:', error)
      alert(error.response?.data?.message || 'Failed to delete folder')
    }
  }

  const handleRenameFolder = async () => {
    if (!editingFolder || !editingFolder.name.trim()) return

    try {
      await axios.put(
        `http://localhost:5000/api/folders/${editingFolder._id}`,
        { name: editingFolder.name.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setEditingFolder(null)
      fetchFolders()
      
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
      successMsg.textContent = 'Folder renamed successfully!'
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)
    } catch (error: any) {
      console.error('Rename error:', error)
      alert(error.response?.data?.message || 'Failed to rename folder')
    }
  }

  if (loading) {
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
        <Sidebar />
        <main className="flex-1 p-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Folders</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Organize your documents with folders
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              <FiPlus className="text-lg" />
              New Folder
            </button>
          </div>

          {/* Create Folder Form */}
          {showCreateForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Folder Name
                  </label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newFolderColor}
                    onChange={(e) => setNewFolderColor(e.target.value)}
                    className="w-16 h-10 rounded-lg cursor-pointer"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateFolder}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Folders Grid */}
          {loadingFolders ? (
            <p className="text-gray-600 dark:text-gray-400">Loading folders...</p>
          ) : folders.length === 0 ? (
            <div className="text-center py-12">
              <FiFolder className="text-gray-300 dark:text-gray-700 text-6xl mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No folders yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders.map((folder) => (
                <div
                  key={folder._id}
                  onClick={() => router.push(`/dashboard/folders/${folder._id}`)}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition cursor-pointer relative group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <FiFolder className="text-4xl" style={{ color: folder.color }} />
                    <div className="flex-1 min-w-0">
                      {editingFolder?._id === folder._id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editingFolder.name}
                            onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            autoFocus
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRenameFolder()
                            }}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {folder.name}
                        </h3>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Created {new Date(folder.createdAt).toLocaleDateString()}
                  </p>

                  {/* Actions */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingFolder(folder)
                      }}
                      className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                      <FiEdit2 className="text-lg" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteFolder(folder._id)
                      }}
                      className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800"
                    >
                      <FiTrash2 className="text-lg" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
