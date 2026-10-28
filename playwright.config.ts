import { defineConfig } from "@playwright/test";

// End-to-end demo path against the production build, the real Supabase project and the real AI.
// Run: npx next build && npx playwright test
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 20 * 60_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 1600, height: 1000 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
