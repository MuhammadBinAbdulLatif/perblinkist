import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', 'prisma', 'music-metadata', 'bcryptjs'],
  // Ensure generated Prisma client + engines are present in the standalone trace
  // (pnpm / Alpine Docker deployments need these at runtime).
  outputFileTracingIncludes: {
    '/*': [
      './node_modules/.prisma/**/*',
      './node_modules/@prisma/client/**/*',
    ],
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
