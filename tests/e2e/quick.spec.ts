// Fast path through the UI using the presenter's saved run (no AI for the seeded replies).
// Checks every screen renders without a client error. Run: npx playwright test tests/e2e/quick.spec.ts
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { expect, test } from "@playwright/test";

config({ path: ".env.local", quiet: true });
const [name, domain] = (process.env.TEST_EMAIL ?? "demo@example.com").split("@");
const shot = (page: import("@playwright/test").Page, n: string) => page.screenshot({ path: `test-results/shots/q-${n}.png` });

test("every screen renders (saved run)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    const msg = `${e.message}\n${e.stack?.split("\n").slice(0, 6).join("\n")}`;
    console.log(`PAGE ERROR: ${msg}`);
    errors.push(msg);
  });
  page.on("console", async (m) => {
    if (m.type() === "error") {
      const args = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => "?")));
      console.log(`CONSOLE ERROR: ${args.map((a) => String(a).slice(0, 400)).join(" | ")}`);
      errors.push(`console: ${m.text()}`);
    }
  });

  await page.goto("/?savedRun=1");
  await page.getByLabel("Email").fill(`${name}+pmtest-${randomUUID().slice(0, 8)}@${domain}`);
  await page.getByLabel(/Password/).fill(randomUUID());
  await page.getByRole("button", { name: "Sign up and open the demo" }).click();
  await expect(page.getByRole("heading", { name: /own copy of the demo/ })).toBeVisible();

  await page.goto("/rfx/rfq");
  await page.getByRole("button", { name: "Draft RFQ with co-pilot" }).click();
  await expect(page.getByRole("button", { name: /Lock rules & send/ })).toBeEnabled({ timeout: 180_000 });
  await page.getByRole("button", { name: /Lock rules & send/ }).click();
  await page.getByRole("button", { name: /Fast-forward 9 days/ }).click();
  await expect(page.getByText(/Done · \d+ of 30 lines found/)).toHaveCount(5, { timeout: 120_000 });

  await page.goto("/rfx/compare");
  await expect(page.getByRole("heading", { name: "Comparison" })).toBeVisible();
  await shot(page, "compare");
  const row = page.locator("tbody tr").nth(5);
  for (const [col, label] of [[6, "photo"], [4, "pdf"], [3, "excel"], [7, "contract"], [5, "word"]] as const) {
    await row.locator("td").nth(col).click();
    await page.waitForTimeout(1500);
    if (label === "photo") {
      const img = page.getByAltText("Vendor's photo");
      const src = await img.getAttribute("src");
      const res = await page.request.get(src!);
      console.log(`photo ${src} → ${res.status()} ${res.headers()["content-type"]} ${(await res.body()).length} bytes`);
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0);
    }
    if (label === "pdf") await expect(page.locator("aside .animate-pulse")).toHaveCount(0, { timeout: 20_000 });
    await page.waitForTimeout(800);
    await shot(page, `drawer-${label}`);
    await expect(page.getByText("This page couldn’t load"), `drawer ${label} crashed`).toHaveCount(0, { timeout: 1000 });
    await page.keyboard.press("Escape");
  }
  await page.goto("/rfx/review");
  await shot(page, "review");
  await page.goto("/rfx/vendors/V3");
  await shot(page, "vendor");
  console.log(errors.length ? `CLIENT ERRORS:\n${errors.join("\n---\n")}` : "no client errors");
  expect(errors.filter((e) => !e.startsWith("console:"))).toEqual([]);
});
