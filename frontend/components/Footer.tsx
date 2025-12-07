'use client'

import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="mb-6">
              <Logo size="lg" className="[&_span]:text-white [&_span]:drop-shadow-md" variant="default" />
            </div>
            <p className="text-gray-400">
              Secure blockchain-verified digital vault for Sierra Leone citizens.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/" className="hover:text-white">Home</a></li>
              <li><a href="/register" className="hover:text-white">Register</a></li>
              <li><a href="/login" className="hover:text-white">Sign In</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">Help Center</a></li>
              <li><a href="#" className="hover:text-white">Contact Us</a></li>
              <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">About</h4>
            <p className="text-gray-400">
              Built for Sierra Leone citizens to securely store and manage their important documents.
            </p>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Sierra Vault. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

