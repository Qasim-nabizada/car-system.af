/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // نادیده گرفتن خطاهای TypeScript در build
  },
  eslint: {
    ignoreDuringBuilds: true, // نادیده گرفتن خطاهای ESLint در build
  },
};

export default nextConfig;

