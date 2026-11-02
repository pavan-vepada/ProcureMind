import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@data": `${import.meta.dirname}/sample-data`, "@": `${import.meta.dirname}/src` } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
  },
});
