// The whole demo story (PRD §6), as a reviewer would click it, with no typing beyond sign-up.
// Saves a screenshot of every screen to test-results/shots/.
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";

config({ path: ".env.local", quiet: true });
const [name, domain] = (process.env.TEST_EMAIL ?? "demo@example.com").split("@");
const email = `${name}+pmtest-${randomUUID().slice(0, 8)}@${domain}`;
const shot = (page: Page, n: string) => page.screenshot({ path: `test-results/shots/${n}.png`, fullPage: false });

test("demo path: sign up → draft → send → replies → compare → evidence → chase → ask → award", async ({ page }) => {
  // 1. Sign up and land inside the demo
  await page.goto("/");
  await shot(page, "01-landing");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/Password/).fill(randomUUID());
  await page.getByRole("button", { name: "Sign up and open the demo" }).click();
  await expect(page.getByRole("heading", { name: /This is your own copy of the demo RFx/ })).toBeVisible();
  await shot(page, "02-workspace");

  // 2. Context
  await page.getByRole("link", { name: /Read the internal request/ }).click();
  await expect(page.getByText("New shipper boxes and inner packaging").first()).toBeVisible();
  await page.getByRole("link", { name: /See the RFI results/ }).click();
  await expect(page.getByRole("heading", { name: /12 vendors asked, 5 shortlisted/ })).toBeVisible();
  await shot(page, "03-rfi");

  // 3. Co-pilot drafts the RFQ, lock rules, send
  await page.goto("/rfx/rfq");
  await page.getByRole("button", { name: "Draft RFQ with co-pilot" }).click();
  await expect(page.getByText(/drafting|Drafting|Reading|Starting/).first()).toBeVisible();
  await page.waitForTimeout(6000);
  await shot(page, "04-rfq-streaming");
  await expect(page.getByRole("button", { name: /Lock rules & send/ })).toBeEnabled({ timeout: 180_000 });
  await expect(page.locator("tbody tr")).toHaveCount(30);
  await shot(page, "05-rfq-drafted");
  await page.getByRole("button", { name: /Lock rules & send/ }).click();
  await expect(page.getByText(/RFQ sent to 5 vendors/).first()).toBeVisible();
  await shot(page, "06-send");

  // 4. Fast-forward: 5 replies, processed automatically and in parallel
  await page.getByRole("button", { name: /Fast-forward 9 days/ }).click();
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
  await page.waitForTimeout(8000);
  await shot(page, "07-inbox-processing");
  await expect(page.getByText(/Done · \d+ of 30 lines found/)).toHaveCount(5, { timeout: 300_000 });
  await expect(page.getByText("LATE")).toBeVisible();
  await shot(page, "08-inbox-done");

  // 5. Comparison
  await page.getByRole("link", { name: /Open comparison/ }).click();
  await expect(page.getByRole("heading", { name: "Comparison" })).toBeVisible();
  await expect(page.getByText("27 / 30 ⚠")).toBeVisible();
  await page.waitForTimeout(1000);
  await shot(page, "09-compare");

  // 6. Evidence: a price read from V4's angled photo
  const firstRow = page.locator("tbody tr").nth(4); // first line row after the 4 summary rows
  await firstRow.locator("td").nth(6).click(); // V4 column
  await expect(page.getByAltText("Vendor's photo")).toBeVisible();
  await page.waitForTimeout(1200);
  await shot(page, "10-drawer-photo");
  await page.keyboard.press("Escape");
  await firstRow.locator("td").nth(4).click(); // V2 column (PDF)
  await page.waitForTimeout(3500);
  await shot(page, "11-drawer-pdf");
  await page.keyboard.press("Escape");

  // 7. Chase V3 for its missing lines; the reply closes the loop
  await page.goto("/rfx/review");
  await shot(page, "12-review");
  await page.getByRole("button", { name: /Ask vendor/ }).first().click();
  await page.getByRole("button", { name: /V3 · / }).click();
  await shot(page, "13-composer");
  await page.getByRole("button", { name: /^Send$/ }).click();
  await expect(page.getByText("Loop closed")).toBeVisible({ timeout: 240_000 });
  await shot(page, "14-loop-closed");
  await page.getByRole("button", { name: /See the updated comparison/ }).click();

  // 8. Ask: split award among passing vendors, then combine volumes; save both
  await page.goto("/rfx/compare");
  await page.getByRole("button", { name: /Split the award/ }).click();
  await expect(page.getByRole("button", { name: /Save as scenario/ })).toBeVisible({ timeout: 120_000 });
  await page.getByRole("button", { name: /Save as scenario/ }).click();
  await page.getByRole("button", { name: /^Save$/ }).click();
  await expect(page.getByText(/Saved as/)).toBeVisible();
  await page.getByRole("button", { name: /combine both plants/ }).click();
  await expect(page.getByRole("button", { name: /Save as scenario/ })).toBeVisible({ timeout: 120_000 });
  await page.getByText("Show working").last().click();
  await shot(page, "15-ask");
  await page.getByRole("button", { name: /Save as scenario/ }).click();
  await page.getByRole("button", { name: /^Save$/ }).click();
  await expect(page.getByText(/Saved as/).nth(1)).toBeVisible();

  // 9. Recommend award
  await page.getByRole("button", { name: /Recommend award/ }).first().click();
  await expect(page.getByText("Award recommendation")).toBeVisible({ timeout: 120_000 });
  await shot(page, "16-memo");
  await page.mouse.wheel(0, 900);
  await shot(page, "17-memo-evidence");
});
