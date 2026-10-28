// Sign-up lands in the buyer's workspace, and it survives a refresh (FR-0.2, FR-0.4, FR-0.7).
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { expect, test } from "@playwright/test";

config({ path: ".env.local", quiet: true });
const [name, domain] = (process.env.TEST_EMAIL ?? "demo@example.com").split("@");

test("sign up lands in the workspace", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill(`${name}+pmtest-${randomUUID().slice(0, 8)}@${domain}`);
  await page.getByLabel(/Password/).fill(randomUUID());
  await page.getByRole("button", { name: "Create account" }).click();
  const heading = page.getByRole("heading", { name: /Good to see you/ });
  await expect(heading).toBeVisible({ timeout: 60_000 });
  await page.reload();
  await expect(heading).toBeVisible();
  await expect(page.getByRole("link", { name: /Continue|View/ })).toHaveCount(4);
});
