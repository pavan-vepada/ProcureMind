// Quick check of sign-up → landing inside the demo (FR-0.2, FR-0.4).
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { expect, test } from "@playwright/test";

config({ path: ".env.local", quiet: true });
const [name, domain] = (process.env.TEST_EMAIL ?? "demo@example.com").split("@");

test("sign up lands inside the demo", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill(`${name}+pmtest-${randomUUID().slice(0, 8)}@${domain}`);
  await page.getByLabel(/Password/).fill(randomUUID());
  await page.getByRole("button", { name: "Sign up and open the demo" }).click();
  const welcome = page.getByRole("heading", { name: /This is your own copy of the demo RFx/ });
  await expect(welcome).toBeVisible();
  await page.reload();
  await expect(welcome).toBeVisible();
});
