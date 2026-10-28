import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is per-user and changes often, so we use the classic dynamic rendering model
  // rather than Cache Components (which would put each session read behind a Suspense boundary).
  cacheComponents: false,
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
