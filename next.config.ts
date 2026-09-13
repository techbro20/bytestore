import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Hide the floating Next.js Dev Tools / route indicator in development UI
  devIndicators: false,
  // Allow phone/LAN access in dev (e.g. http://192.168.x.x:3000)
  allowedDevOrigins: ['192.168.100.29', 'localhost', '127.0.0.1'],
};

export default nextConfig;
