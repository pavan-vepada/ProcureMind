import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is per-user and changes often, so we use the classic dynamic rendering model
  // rather than Cache Components (which would put each session read behind a Suspense boundary).
  cacheComponents: false,
  // No floating build indicator in development; it overlapped the account button.
  devIndicators: false,
  // File readers run on the server as plain Node packages, not bundled.
  serverExternalPackages: ["pdfjs-dist", "exceljs", "mammoth"],
  // The sample vendor files are read from disk by the reply pipeline and the file viewer.
  outputFileTracingIncludes: {
    "/api/**": ["./sample-data/files/**"],
    "/rfx/**": ["./sample-data/files/**"],
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
