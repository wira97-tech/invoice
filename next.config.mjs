/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Disable worker threads to avoid Jest worker errors
    webpackBuildWorker: false,
  },
  // Ensure compatibility with current dependencies
  swcMinify: true,
  poweredByHeader: false,
}

export default nextConfig
