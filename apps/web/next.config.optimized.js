/**
 * Optimized Next.js Configuration for Production Performance
 */

const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    // App directory for better performance
    appDir: false, // Keep using pages for now
    
    // Optimize CSS
    optimizeCss: true,
    
    // Enable SWC minification (faster than Terser)
    swcMinify: true,
    
    // Enable modern builds for supported browsers
    modern: true,
    
    // Optimize font loading
    fontLoaders: [
      { loader: 'next/font/google', options: { subsets: ['latin'] } },
    ],
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error']
    } : false,
    
    // Enable emotion optimization
    emotion: true,
    
    // Remove React DevTools in production
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },

  // Bundle optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Vendor chunk for stable libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            chunks: 'initial',
            name: 'vendor',
            priority: 10,
            enforce: true,
          },
          
          // Common chunk for shared components
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
          
          // Chart.js in separate chunk (large library)
          charts: {
            test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
            name: 'charts',
            priority: 20,
          },
          
          // Emotion styling in separate chunk
          emotion: {
            test: /[\\/]node_modules[\\/](@emotion|emotion)[\\/]/,
            name: 'emotion',
            priority: 15,
          },
          
          // Lucide icons in separate chunk
          icons: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'icons',
            priority: 15,
          },
          
          // React Query in separate chunk
          reactQuery: {
            test: /[\\/]node_modules[\\/](@tanstack\/react-query)[\\/]/,
            name: 'react-query',
            priority: 15,
          },
        },
      };
    }

    // Optimize imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/theme': path.resolve(__dirname, 'src/theme'),
      '@/types': path.resolve(__dirname, 'src/types'),
    };

    // Add webpack plugins for optimization
    if (!dev) {
      // Bundle analyzer (only when ANALYZE=true)
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: `../analyze/client.html`,
          })
        );
      }

      // Webpack Bundle Analyzer for server
      if (isServer && process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: `../analyze/server.html`,
          })
        );
      }
    }

    return config;
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
      // Cache static assets
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache API responses
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300', // 5 minutes
          },
        ],
      },
    ];
  },

  // Compression
  compress: true,

  // Power optimizations
  poweredByHeader: false,

  // Generate ETags for caching
  generateEtags: true,

  // Environment variables for runtime config
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // TypeScript configuration
  typescript: {
    // Allow production builds to complete even with type errors
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },

  // ESLint configuration
  eslint: {
    // Allow production builds to complete even with ESLint errors
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },

  // Output optimization
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Trailing slash handling
  trailingSlash: false,

  // Redirect configuration
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },

  // Rewrites for API optimization
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/api/health',
      },
    ];
  },
};

module.exports = nextConfig;