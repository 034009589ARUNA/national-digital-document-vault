/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Optimize compilation speed
  swcMinify: true,
  
  // Enable experimental features for faster builds
  experimental: {
    // optimizeCss: true, // Disabled - requires 'critters' package
    // Faster refresh
    optimizePackageImports: ['react-icons'],
  },
  
  // Optimize webpack
  webpack: (config, { dev, isServer }) => {
    // Optimize for development - faster compilation
    if (dev) {
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      }
      
      // Faster rebuilds
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      }
    }
    
    return config
  },
  
  // Enable prefetching for all links (default behavior)
  // This works with our RoutePrefetcher component
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Reduce bundle size
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig

