import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    dirs: ['.'],
    ignoreDuringBuilds: true, // handled in CI
  },
  experimental: {
    typedRoutes: true,
  },
  typescript: {
    ignoreBuildErrors: true, // handled in CI
  },
}

export default nextConfig
