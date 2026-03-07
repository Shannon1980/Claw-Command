import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake server-only packages from client bundles
  serverExternalPackages: ["pg", "pino", "googleapis", "docx"],

  // Compress responses
  compress: true,

  // Strict React mode for catching issues early
  reactStrictMode: true,

  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      "recharts",
      "@xyflow/react",
      "@hello-pangea/dnd",
      "zustand",
    ],
  },
};

export default nextConfig;
