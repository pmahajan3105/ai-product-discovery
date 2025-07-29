/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Allow images from external sources (for user avatars, etc.)
  images: {
    domains: ['lh3.googleusercontent.com'],
  },

  // Environment variables to expose to client-side
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },

  // Redirect root to sign-in page for now
  async redirects() {
    return [
      {
        source: '/',
        destination: '/signin',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;