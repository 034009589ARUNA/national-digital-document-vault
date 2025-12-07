'use client'

import { useState } from 'react'
import axios from 'axios'

export default function TestConnectionPage() {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<any>(null)

  const testConnection = async () => {
    setStatus('testing')
    setMessage('Testing connection to backend...')
    setResponse(null)

    try {
      // Test health endpoint
      const healthResponse = await axios.get('http://localhost:5000/api/health')
      setResponse(healthResponse.data)
      setStatus('success')
      setMessage('✅ Backend is connected and responding!')
    } catch (error: any) {
      setStatus('error')
      if (error.code === 'ECONNREFUSED') {
        setMessage('❌ Connection refused. Make sure the backend server is running on port 5000.')
      } else if (error.code === 'ERR_NETWORK') {
        setMessage('❌ Network error. Check if backend is running and CORS is configured correctly.')
      } else {
        setMessage(`❌ Error: ${error.message}`)
      }
      setResponse(error.response?.data || { error: error.message })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Backend Connection Test
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <button
            onClick={testConnection}
            disabled={status === 'testing'}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'testing' ? 'Testing...' : 'Test Backend Connection'}
          </button>
        </div>

        {status !== 'idle' && (
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${
            status === 'success' ? 'border-l-4 border-green-500' : 
            status === 'error' ? 'border-l-4 border-red-500' : ''
          }`}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {status === 'testing' ? 'Testing...' : 
               status === 'success' ? 'Connection Successful' : 
               'Connection Failed'}
            </h2>
            
            <p className={`mb-4 ${
              status === 'success' ? 'text-green-600 dark:text-green-400' :
              status === 'error' ? 'text-red-600 dark:text-red-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {message}
            </p>

            {response && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Response:
                </h3>
                <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-auto text-sm">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}

            {status === 'error' && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Troubleshooting Steps:
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                  <li>Make sure the backend server is running: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">npm start</code> in the backend folder</li>
                  <li>Check that the backend is running on port 5000</li>
                  <li>Verify CORS is enabled in the backend (should be in server.js)</li>
                  <li>Check the browser console for any additional error messages</li>
                  <li>Check the backend terminal for request logs</li>
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            What to check:
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
            <li>Backend terminal should show: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">Server running on port 5000</code></li>
            <li>When you click "Test Connection", you should see a log in the backend terminal like: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">[timestamp] GET /api/health</code></li>
            <li>If you don't see backend logs, the requests aren't reaching the backend</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

