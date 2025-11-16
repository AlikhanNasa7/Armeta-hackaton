import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  images: {
    domains: [
      'c4dac4a814a5.ngrok-free.app',
      'lh3.googleusercontent.com',
      'vparu.kz',
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}
export default nextConfig
