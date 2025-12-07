'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

interface User {
  id: string
  name: string
  email: string
  role?: 'user' | 'issuer' | 'requester' | 'auditor' | 'admin'
  institutionId?: string | null
  isActive?: boolean
  profileImage?: string
  theme: string
  storageUsed: number
  storageQuota: number
  phone?: string
  address?: string
  dateOfBirth?: string
  bio?: string
  notificationsEnabled?: boolean
  emailNotifications?: boolean
  language?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<User | null>
  logout: () => void
  fetchUser: () => Promise<void>
  updateUser: (data: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await axios.get('http://localhost:5000/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Map backend user data to frontend User interface
      const userData: User = {
        id: response.data._id || response.data.id,
        name: response.data.name || '',
        email: response.data.email || '',
        role: response.data.role || 'user',
        institutionId: response.data.institutionId || null,
        isActive: response.data.isActive !== false,
        profileImage: response.data.profileImage || undefined,
        theme: response.data.theme || 'auto',
        storageUsed: response.data.storageUsed || 0,
        storageQuota: response.data.storageQuota || 10737418240, // 10GB default
        phone: response.data.phone,
        address: response.data.address,
        dateOfBirth: response.data.dateOfBirth,
        bio: response.data.bio,
        notificationsEnabled: response.data.notificationsEnabled !== false,
        emailNotifications: response.data.emailNotifications !== false,
        language: response.data.language || 'en'
      }
      
      setUser(userData)
    } catch (error) {
      console.error('Fetch user error:', error)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    if (savedToken) {
      setToken(savedToken)
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      })
      const token = response.data.token
      setToken(token)
      localStorage.setItem('token', token)
      
      // Set user data from login response if available
      if (response.data.user) {
        const userData: User = {
          id: response.data.user.id || response.data.user._id,
          name: response.data.user.name || '',
          email: response.data.user.email || '',
          role: response.data.user.role || 'user',
          institutionId: response.data.user.institutionId || null,
          isActive: response.data.user.isActive !== false,
          profileImage: response.data.user.profileImage,
          theme: response.data.user.theme || 'auto',
          storageUsed: response.data.user.storageUsed || 0,
          storageQuota: response.data.user.storageQuota || 10737418240
        }
        setUser(userData)
        return userData
      } else {
        // Fetch full user profile after login
        await fetchUser()
        return user
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
  }

  const updateUser = async (data: Partial<User>) => {
    try {
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await axios.put('http://localhost:5000/api/user/profile', data, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Map backend user data to frontend User interface
      const userData: User = {
        id: response.data._id || response.data.id || user?.id || '',
        name: response.data.name || user?.name || '',
        email: response.data.email || user?.email || '',
        role: response.data.role || user?.role || 'user',
        institutionId: response.data.institutionId || user?.institutionId || null,
        isActive: response.data.isActive !== false,
        profileImage: response.data.profileImage || user?.profileImage || undefined,
        theme: response.data.theme || user?.theme || 'auto',
        storageUsed: response.data.storageUsed || user?.storageUsed || 0,
        storageQuota: response.data.storageQuota || user?.storageQuota || 10737418240,
        phone: response.data.phone || user?.phone,
        address: response.data.address || user?.address,
        dateOfBirth: response.data.dateOfBirth || user?.dateOfBirth,
        bio: response.data.bio || user?.bio,
        notificationsEnabled: response.data.notificationsEnabled !== false,
        emailNotifications: response.data.emailNotifications !== false,
        language: response.data.language || user?.language || 'en'
      }
      
      setUser(userData)
      return userData
    } catch (error) {
      console.error('Update user error:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, fetchUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
