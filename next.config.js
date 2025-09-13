import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.alias["@"] = path.resolve(process.cwd(), "src");
    
    // حل مشکل bcrypt برای سرور
    if (isServer) {
      config.resolve.alias["bcrypt"] = path.resolve(process.cwd(), "node_modules/bcryptjs");
    }
    
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;