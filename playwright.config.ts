import { defineConfig } from "@playwright/test";

// End-to-end path against the production build, the real Supabase project and the real AI.
// Local: npx next build && npx playwright test
// Live site: BASE_URL=https://procure-mind-v2.vercel.app npx playwright test (no local server is started)
const live = process.env.BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 20 * 60_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: live ?? "http://localhost:3100",
    viewport: { width: 1600, height: 1000 },
    screenshot: "only-on-failure",
  },
  webServer: live
    ? undefined
    : {
        command: "npx next start -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
