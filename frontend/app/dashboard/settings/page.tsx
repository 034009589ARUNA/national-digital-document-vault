'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { useTheme } from '@/app/context/ThemeContext'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import { FiMoon, FiBell, FiGlobe } from 'react-icons/fi'
import axios from 'axios'

export default function SettingsPage() {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const { theme, setTheme: setThemeContext } = useTheme()
  const [settings, setSettings] = useState({
    theme: 'auto',
    notificationsEnabled: true,
    emailNotifications: true,
    language: 'en'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login')
    }
  }, [loading, token, router])

  useEffect(() => {
    if (user) {
      setSettings({
        theme: theme || user.theme || 'auto',
        notificationsEnabled: user.notificationsEnabled !== false,
        emailNotifications: user.emailNotifications !== false,
        language: user.language || 'en'
      })
    }
  }, [user, theme])

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    if (key === 'theme') {
      setThemeContext(value)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      await axios.put(
        'http://localhost:5000/api/user/settings',
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
      successMsg.textContent = 'Settings saved successfully!'
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)
    } catch (error: any) {
      console.error('Save settings error:', error)
      alert(error.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

          <div className="max-w-2xl space-y-6">
            {/* Theme Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <FiMoon className="text-2xl text-gray-600 dark:text-gray-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Appearance</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme
                </label>
                <div className="flex gap-4">
                  {['light', 'dark', 'auto'].map((themeOption) => (
                    <label key={themeOption} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="theme"
                        value={themeOption}
                        checked={settings.theme === themeOption}
                        onChange={(e) => handleSettingChange('theme', e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700 dark:text-gray-300 capitalize">{themeOption}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Language Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <FiGlobe className="text-2xl text-gray-600 dark:text-gray-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Language</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="en">English</option>
                  <option value="krio">Krio</option>
                  <option value="fr">French</option>
                </select>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <FiBell className="text-2xl text-gray-600 dark:text-gray-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h2>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notificationsEnabled}
                    onChange={(e) => handleSettingChange('notificationsEnabled', e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    Enable notifications
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                    disabled={!settings.notificationsEnabled}
                    className="w-5 h-5 rounded disabled:opacity-50"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    Email notifications
                  </span>
                </label>
              </div>
            </div>

            {/* Privacy & Security */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Privacy & Security</h2>

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>Your documents are encrypted and stored securely using blockchain verification.</p>
                <p>All data transfers are encrypted using SSL/TLS protocols.</p>
                <p>You can revoke access to any shared documents at any time.</p>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
