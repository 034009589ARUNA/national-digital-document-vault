'use client'

import Link from 'next/link'
import { FiLock, FiCheckCircle, FiUpload, FiFileText, FiShield, FiArrowRight, FiGlobe, FiZap } from 'react-icons/fi'
import Logo from '@/components/Logo'

export default function Home() {
  return (
    <div className="bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 py-24 md:py-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <div className="flex justify-center mb-8 animate-fade-in">
              <Logo size="xl" variant="hero" />
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight animate-fade-in-up">
              Your Documents, 
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600">
                Secured Forever
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
              Sierra Vault - A blockchain-verified digital vault for all your important documents.
              Never lose your birth certificate, property deed, or degree again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-400">
              <Link
                href="/register"
                className="group bg-gradient-to-r from-primary-600 to-blue-600 text-white px-10 py-5 rounded-xl text-lg font-semibold hover:from-primary-700 hover:to-blue-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                Get Started Free
                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="bg-white text-primary-600 px-10 py-5 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-primary-600 transform hover:-translate-y-1"
              >
                Sign In
              </Link>
            </div>
            <p className="mt-6 text-sm text-gray-500 animate-fade-in animation-delay-600">
              ✓ Free forever • ✓ No credit card required • ✓ Blockchain verified
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Why Choose Sierra Vault?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Built with cutting-edge technology to protect what matters most to you
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="group bg-gradient-to-br from-white to-blue-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className="bg-gradient-to-br from-primary-500 to-blue-500 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <FiShield className="text-white text-3xl" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Blockchain Verified</h3>
            <p className="text-gray-600 leading-relaxed">
              Every document is verified and stored on blockchain, making it tamper-proof and secure forever. Your documents are immutable and permanently protected.
            </p>
          </div>

          <div className="group bg-gradient-to-br from-white to-blue-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className="bg-gradient-to-br from-primary-500 to-blue-500 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <FiLock className="text-white text-3xl" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Military-Grade Security</h3>
            <p className="text-gray-600 leading-relaxed">
              Your documents are encrypted with industry-leading security standards. Only you have access to your vault with end-to-end encryption.
            </p>
          </div>

          <div className="group bg-gradient-to-br from-white to-blue-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className="bg-gradient-to-br from-primary-500 to-blue-500 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <FiGlobe className="text-white text-3xl" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Always Accessible</h3>
            <p className="text-gray-600 leading-relaxed">
              Access your documents anytime, anywhere, on any device. No more worrying about lost or damaged papers. Your vault is always with you.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gradient-to-br from-gray-50 to-blue-50 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes with our simple three-step process
            </p>
          </div>
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="bg-gradient-to-br from-primary-600 to-blue-600 text-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold shadow-xl group-hover:scale-110 transition-transform duration-300">
                    1
                  </div>
                  <div className="absolute -top-2 -right-2 bg-yellow-400 w-6 h-6 rounded-full animate-pulse"></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 group-hover:shadow-xl transition-shadow">
                  <FiUpload className="text-primary-600 text-5xl mx-auto mb-4" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Upload Documents</h3>
                <p className="text-gray-600 leading-relaxed">
                  Upload your important documents securely to your vault. Supports PDF, images, and more.
                </p>
              </div>

              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="bg-gradient-to-br from-primary-600 to-blue-600 text-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold shadow-xl group-hover:scale-110 transition-transform duration-300">
                    2
                  </div>
                  <div className="absolute -top-2 -right-2 bg-green-400 w-6 h-6 rounded-full animate-pulse animation-delay-2000"></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 group-hover:shadow-xl transition-shadow">
                  <FiZap className="text-primary-600 text-5xl mx-auto mb-4" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Blockchain Verification</h3>
                <p className="text-gray-600 leading-relaxed">
                  Each document is instantly verified and stored on blockchain for permanent security and authenticity.
                </p>
              </div>

              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="bg-gradient-to-br from-primary-600 to-blue-600 text-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold shadow-xl group-hover:scale-110 transition-transform duration-300">
                    3
                  </div>
                  <div className="absolute -top-2 -right-2 bg-blue-400 w-6 h-6 rounded-full animate-pulse animation-delay-4000"></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 group-hover:shadow-xl transition-shadow">
                  <FiFileText className="text-primary-600 text-5xl mx-auto mb-4" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Access Anytime</h3>
                <p className="text-gray-600 leading-relaxed">
                  View, download, or verify your documents whenever you need. Your vault is always accessible.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <FiCheckCircle className="text-primary-600 text-2xl" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Instant Verification</h3>
                <p className="text-gray-600">Verify document authenticity instantly with blockchain technology</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <FiShield className="text-primary-600 text-2xl" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Zero Downtime</h3>
                <p className="text-gray-600">99.9% uptime guarantee - your documents are always available</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <FiLock className="text-primary-600 text-2xl" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Privacy First</h3>
                <p className="text-gray-600">Your data is encrypted and never shared with third parties</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <FiGlobe className="text-primary-600 text-2xl" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Multi-Device Access</h3>
                <p className="text-gray-600">Access your vault from any device, anywhere in the world</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative bg-gradient-to-r from-primary-600 via-blue-600 to-primary-700 py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Secure Your Documents?
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join thousands of Sierra Leone citizens protecting their important documents with blockchain technology
          </p>
          <Link
            href="/register"
            className="group inline-flex items-center gap-3 bg-white text-primary-600 px-10 py-5 rounded-xl text-lg font-semibold hover:bg-gray-100 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1"
          >
            Create Your Vault Now
            <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="mt-8 text-blue-100 text-sm">
            No credit card required • Free forever • Setup in 2 minutes
          </p>
        </div>
      </section>
    </div>
  )
}

