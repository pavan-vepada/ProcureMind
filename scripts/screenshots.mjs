// Takes the product screenshots used in the README and docs (docs/images/*.png).
// Needs the app running (npx next build && npx next start -p 3100) and .env.local with TEST_EMAIL.
// Signs up a throwaway account; run scripts/cleanup-test-users.mjs afterwards.
// Usage: node scripts/screenshots.mjs [baseUrl]
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "@playwright/test";

config({ path: ".env.local", quiet: true });
const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = "docs/images";
const SHOWN_EMAIL = "pavan@sunrise-consumer.example";
const [name, domain] = (process.env.TEST_EMAIL ?? "").split("@");
if (!domain) throw new Error("Set TEST_EMAIL in .env.local");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
// The throwaway login address never appears in a picture.
await page.addInitScript((shown) => {
  const fix = () => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.nodeValue.includes("+pmtest-")) n.nodeValue = n.nodeValue.replace(/\S+\+pmtest-[^@\s]*@\S+/g, shown);
  };
  addEventListener("DOMContentLoaded", () => { fix(); new MutationObserver(fix).observe(document.body, { subtree: true, childList: true, characterData: true }); });
}, SHOWN_EMAIL);

const shot = async (file, opts = {}) => {
  await page.waitForTimeout(opts.wait ?? 700);
  await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: false });
  console.log(`  ${file}.png`);
};
const tab = (n) => page.getByRole("navigation", { name: "RFx sections" }).getByRole("link", { name: new RegExp(`^${n}`) });
const openRfx = async (title) => {
  await page.goto(`${BASE}/rfx`);
  await page.getByRole("link", { name: title }).first().click();
  await page.getByRole("navigation", { name: "RFx sections" }).waitFor();
};

// 1. Sign in
await page.goto(BASE);
await shot("01-login");
await page.getByLabel("Email").fill(`${name}+pmtest-${randomUUID().slice(0, 8)}@${domain}`);
await page.getByLabel(/Password/).fill(randomUUID());
await page.getByRole("button", { name: "Create account" }).click();
await page.getByRole("heading", { name: "Sourcing events", level: 1 }).waitFor({ timeout: 60_000 });
await shot("02-workspace");

// 2. The RFx in analysis
await openRfx(/Corrugated packaging for both plants/);
await page.getByRole("heading", { name: /quotes on one basis/ }).waitFor();
await shot("03-rfx-overview");
await tab("Comparison").click();
await page.getByText("27 / 30 ⚠").waitFor();
await shot("04-comparison", { wait: 1200 });
await page.locator("tbody tr").nth(5).locator("td").nth(6).click();
await page.getByAltText("Vendor's photo").waitFor();
await shot("05-evidence-photo", { wait: 1800 });
await page.keyboard.press("Escape");
await page.locator("tbody tr").nth(6).locator("td").nth(4).click();
await shot("06-evidence-pdf", { wait: 3500 });
await page.keyboard.press("Escape");

await tab("Review").click();
await page.getByRole("heading", { name: "Review queue" }).waitFor();
await shot("07-review-queue");
await page.getByRole("button", { name: /Ask supplier/ }).first().click();
const dialog = page.getByRole("dialog", { name: "Ask supplier for clarification" });
await dialog.getByRole("button", { name: /^Shakti/ }).click();
await shot("08-clarification-email");
await dialog.getByRole("button", { name: /^Send$/ }).click();
await dialog.getByText("Reply received").waitFor({ timeout: 180_000 });
await shot("09-loop-closed");
await dialog.getByRole("button", { name: /See the updated comparison/ }).click();
await page.getByText("30 / 30").first().waitFor();

await page.getByRole("button", { name: /combine both plants/ }).click();
await page.getByRole("button", { name: /Save as scenario/ }).waitFor({ timeout: 120_000 });
await shot("10-ask-what-if", { wait: 1500 });

// 3. Awarded RFx: the memo
await openRfx(/Inner packaging renewal/);
await tab("Award").click();
await page.getByText("Award recommendation").waitFor();
await shot("11-award-memo");

// 4. Replies being read live
await openRfx(/Heavy-duty export cartons/);
await tab("Replies").click();
await shot("12-replies-live", { wait: 4000 });

// 5. Ready to send: RFQ with locked evaluation rules
await openRfx(/Q3 capacity buffer/);
await tab("RFQ").click();
await page.getByRole("button", { name: /Lock rules & send/ }).waitFor();
await shot("13-rfq-and-rules");

// 6. The co-pilot drafting a new RFx from a plant's request
await page.goto(`${BASE}/rfx/new`);
await shot("14-new-rfx");
await page.getByRole("button", { name: /Create RFx and draft/ }).click();
await page.getByRole("button", { name: /^Draft RFQ$/ }).click();
await page.getByText("Drafting", { exact: true }).waitFor({ timeout: 60_000 });
await page.waitForFunction(() => document.querySelectorAll("tbody tr").length >= 6, null, { timeout: 120_000 });
await shot("15-copilot-drafting", { wait: 300 });
await page.getByText(/^Drafted from/).waitFor({ timeout: 180_000 }); // fails if the live AI fell back

await browser.close();
