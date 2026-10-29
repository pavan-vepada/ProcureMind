// A new buyer's first session, end to end, with the live AI. Screenshots: test-results/shots/w-*.png
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";

config({ path: ".env.local", quiet: true });
const [name, domain] = (process.env.TEST_EMAIL ?? "demo@example.com").split("@");
const shot = (page: Page, n: string) => page.screenshot({ path: `test-results/shots/w-${n}.png` });
const errors: string[] = [];

function watch(page: Page) {
  page.on("pageerror", (e) => { errors.push(e.message); console.log(`PAGE ERROR: ${e.message}`); });
  page.on("console", (m) => { if (m.type() === "error" && !/hydrat/i.test(m.text())) { errors.push(m.text()); console.log(`CONSOLE ERROR: ${m.text().slice(0, 300)}`); } });
}

async function signUp(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill(`${name}+pmtest-${randomUUID().slice(0, 8)}@${domain}`);
  await page.getByLabel(/Password/).fill(randomUUID());
  const t = Date.now();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Sourcing events", level: 1 })).toBeVisible({ timeout: 60_000 });
  console.log(`workspace ready in ${((Date.now() - t) / 1000).toFixed(1)}s`);
}

const open = (page: Page, title: RegExp) => page.getByRole("link", { name: title }).first().click();

test("first session: workspace, analysis, live replies, send, new RFx", async ({ page }) => {
  watch(page);
  await signUp(page);
  // The titles also appear in the worklist, so check the event rows themselves.
  const event = (title: string) => page.getByRole("link", { name: new RegExp(`^(Continue|View) ${title}`) });
  await expect(event("Corrugated packaging for both plants")).toBeVisible();
  await expect(event("Heavy-duty export cartons")).toBeVisible();
  await expect(event("Inner packaging renewal")).toBeVisible();
  await expect(event("Q3 capacity buffer")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Needs your action" })).toBeVisible();
  await shot(page, "01-home");

  // 1. The RFx in analysis: overview → comparison → evidence → review → chase V3 → ask → save → award
  await open(page, /Corrugated packaging for both plants/);
  await expect(page.getByRole("heading", { name: /quotes on one basis/ })).toBeVisible();
  await shot(page, "02-overview");
  const tab = (n: string) => page.getByRole("navigation", { name: "RFx sections" }).getByRole("link", { name: new RegExp(`^${n}`) });
  await tab("Comparison").click();
  await expect(page.getByText("27 / 30 ⚠")).toBeVisible();
  await page.waitForTimeout(800);
  await shot(page, "03-compare");
  await page.locator("tbody tr").nth(5).locator("td").nth(6).click();
  await expect(page.getByAltText("Vendor's photo")).toBeVisible();
  await page.waitForTimeout(1500);
  await shot(page, "04-drawer-photo");
  await page.keyboard.press("Escape");

  await tab("Review").click();
  await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
  await shot(page, "05-review");
  await page.getByRole("button", { name: /Ask supplier/ }).first().click();
  const dialog = page.getByRole("dialog", { name: "Ask supplier for clarification" });
  await dialog.getByRole("button", { name: /^Shakti/ }).click();
  await shot(page, "05b-composer");
  await dialog.getByRole("button", { name: /^Send$/ }).click();
  await expect(dialog.getByText("Reply received")).toBeVisible({ timeout: 180_000 });
  await shot(page, "06-loop-closed");
  await dialog.getByRole("button", { name: /See the updated comparison/ }).click();

  await tab("Comparison").click();
  await page.getByRole("button", { name: /combine both plants/ }).click();
  await expect(page.getByRole("button", { name: /Save as scenario/ })).toBeVisible({ timeout: 120_000 });
  await page.getByRole("button", { name: /Save as scenario/ }).click();
  await page.getByRole("button", { name: /^Save$/ }).click();
  await expect(page.getByText(/Saved as “.*combined/)).toBeVisible();
  await shot(page, "07-ask");
  await page.getByRole("button", { name: /Recommend award/ }).first().click();
  await expect(page.getByText("Award recommendation")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(/Scenario: “.*combined/)).toBeVisible();
  await shot(page, "08-memo");

  // 2. The RFx with replies arriving: one is read live as soon as the tab opens; bring in the last one
  await page.goto("/rfx");
  await open(page, /Heavy-duty export cartons/);
  await tab("Replies").click();
  await page.waitForTimeout(4000);
  await shot(page, "09-replies-live");
  await page.getByRole("button", { name: /Simulate 1 supplier reply/ }).click();
  await expect(page.getByText(/Read · \d+ of 10 lines found/)).toHaveCount(4, { timeout: 240_000 });
  await shot(page, "10-replies-done");

  // 3. The drafted RFx: lock and send
  await page.goto("/rfx");
  await open(page, /Q3 capacity buffer/);
  await shot(page, "11-ready-overview");
  await tab("RFQ").click();
  await page.getByRole("button", { name: /Lock rules & send/ }).click();
  await expect(page.getByText(/Waiting for 3 suppliers/)).toBeVisible();
  await shot(page, "12-sent");

  // 4. The awarded RFx
  await page.goto("/rfx");
  await open(page, /Inner packaging renewal/);
  await tab("Award").click();
  await expect(page.getByText("Award recommendation")).toBeVisible();
  await shot(page, "13-awarded");

  // 5. New RFx from a waiting request: the co-pilot drafts live
  await page.goto("/rfx/new");
  await shot(page, "14-new");
  await page.getByRole("button", { name: /Create RFx and draft/ }).click();
  await page.getByRole("button", { name: /^Draft RFQ$/ }).click();
  await expect(page.getByRole("button", { name: /Lock rules & send/ })).toBeEnabled({ timeout: 180_000 });
  await shot(page, "15-new-drafted");

  // 6. New RFx from a free-text need
  await page.goto("/rfx/new");
  await page.getByRole("button", { name: /Describe a need/ }).click();
  await page.getByText("Use an example").click();
  await page.getByRole("button", { name: /Create RFx and draft/ }).click();
  await page.getByRole("button", { name: /^Draft RFQ$/ }).click();
  await expect(page.getByRole("button", { name: /Lock rules & send/ })).toBeEnabled({ timeout: 180_000 });
  await shot(page, "16-need-drafted");

  await page.goto("/rfx");
  await shot(page, "17-home-after");
  expect(errors).toEqual([]);
});
