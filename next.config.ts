import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is per-user and changes often, so we use the classic dynamic rendering model
  // rather than Cache Components (which would put each session read behind a Suspense boundary).
  cacheComponents: false,
  // File readers run on the server as plain Node packages, not bundled.
  serverExternalPackages: ["pdfjs-dist", "exceljs", "mammoth"],
  // The seeded vendor files are read from disk by the reply pipeline and the file viewer.
  outputFileTracingIncludes: {
    "/api/**": ["./seed/files/**"],
    "/rfx/**": ["./seed/files/**"],
  },
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
