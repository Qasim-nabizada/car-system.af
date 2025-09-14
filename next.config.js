/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // این خط اضافه شود - راه حل اول
  onWarning: (warning) => {
    if (warning.message.includes('TypeScript') || warning.message.includes('typescript')) {
      return;
    }
    console.warn(warning.message);
  },
};

export default nextConfig;