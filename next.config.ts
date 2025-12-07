import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Standalone output (Required for Docker)
  output: "standalone",
  
  // 2. Disable ESLint during build (Saves ~150MB RAM)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 3. Disable TypeScript checking during build (Saves ~200MB RAM)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;