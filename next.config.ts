import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: [
    "3000-i7ros26y31zjgmiuyt4rh-0e616f0a.sandbox.novita.ai",
    "3000-i7ros26y31zjgmiuyt4rh-0e616f0a.sandbox.gensparksite.com",
    "*.sandbox.novita.ai",
    "*.sandbox.gensparksite.com",
  ],
};

export default nextConfig;
