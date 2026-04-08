import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg", "pdfkit"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ビルド時のデータ取得を無効化
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
};

export default nextConfig;
