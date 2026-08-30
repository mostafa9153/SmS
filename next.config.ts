import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Tree-shake heavy packages to reduce bundle size and speed up compilation
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "@tanstack/react-table",
      "clsx",
      "tailwind-merge",
    ],
  },
};

export default nextConfig;
