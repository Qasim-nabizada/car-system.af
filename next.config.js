const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["bcrypt"],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      'bcrypt': require.resolve('bcryptjs')
    };
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,  // این خط اضافه شود
  },
  eslint: {
    ignoreDuringBuilds: true,  // این خط اضافه شود
  },
};

module.exports = nextConfig;