// Live AI accuracy check against the answer key (PRD metric: ≥ 95% of price cells correct).
// Costs money, so it only runs when asked:  RUN_EVAL=1 npx vitest run tests/eval
import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import demo from "@/seed/demo.json";
import type { Line } from "@/lib/engine/types";
import { extractReply } from "@/lib/extract/extract";
import { prepare, type FileKind } from "@/lib/extract/prepare";
import { asExtraction } from "@/lib/extract/schema";

config({ path: ".env.local", quiet: true });
const lines = demo.lines.map((l) => ({ ...l, id: `L${l.line_no}` }) as Line);
const only = process.env.EVAL_VENDOR;

describe.skipIf(!process.env.RUN_EVAL)("live extraction accuracy", () => {
  for (const reply of demo.replies.filter((r) => !only || r.vendor_code === only)) {
    it(`reads ${reply.vendor_code} correctly`, { timeout: 300_000 }, async () => {
      const parts = [await prepare(null, "text", reply.body)];
      for (const a of reply.attachments) {
        const buf = await readFile(path.join("seed/files", a.filename));
        parts.push(await prepare(a.filename, a.kind as FileKind, buf, a.mime));
      }
      const { extraction: x, ms, model } = await extractReply(
        { vendorName: reply.vendor_code, vendorCode: reply.vendor_code, lines, questions: demo.questions, paymentDays: 60 },
        parts,
      );
      const ideal = asExtraction(demo.ideal_extraction.replies.find((r) => r.vendor_code === reply.vendor_code));

      let right = 0;
      const wrong: string[] = [];
      for (const want of ideal.quotes) {
        const got = x.quotes.find((q) => q.line_no === want.line_no);
        const same = got && Math.abs(got.price - want.price) < 1e-6 && got.unit === want.unit && got.currency === want.currency
          && (got.bundle_size ?? null) === (want.bundle_size ?? null) && got.gst_included === want.gst_included
          && JSON.stringify(got.tiers.map((t) => [t.min_qty, t.price])) === JSON.stringify(want.tiers.map((t) => [t.min_qty, t.price]));
        if (same) right++;
        else wrong.push(`line ${want.line_no}: want ${JSON.stringify([want.price, want.unit, want.currency, want.tiers])} got ${JSON.stringify(got && [got.price, got.unit, got.currency, got.tiers])}`);
      }
      const accuracy = right / ideal.quotes.length;
      console.log(`${reply.vendor_code}: ${right}/${ideal.quotes.length} prices (${(accuracy * 100).toFixed(0)}%) in ${(ms / 1000).toFixed(0)}s with ${model}`);
      console.log(`  missing ${JSON.stringify(x.missing_lines)} unreadable ${JSON.stringify(x.unreadable_lines)} rest_from_last_year ${x.rest_from_last_year}`);
      console.log(`  terms ${JSON.stringify(x.terms)} discount ${JSON.stringify(x.discount)}`);
      console.log(`  answers met ${x.answers.filter((a) => a.met).map((a) => a.q_no).join(",")} certs ${JSON.stringify(x.certificates.map((c) => [c.name, c.valid_until]))}`);
      if (wrong.length) console.log(`  wrong:\n   ${wrong.slice(0, 8).join("\n   ")}`);

      // The app works out missing lines itself (not priced, not unreadable), so check that, not the AI's list.
      const priced = new Set(x.quotes.map((q) => q.line_no));
      const missing = x.rest_from_last_year ? [] : lines.map((l) => l.line_no).filter((n) => !priced.has(n) && !x.unreadable_lines.includes(n));
      expect(accuracy).toBeGreaterThanOrEqual(0.95);
      expect(new Set(missing)).toEqual(new Set(ideal.missing_lines));
      expect(new Set(x.unreadable_lines)).toEqual(new Set(ideal.unreadable_lines));
      expect(x.rest_from_last_year).toBe(ideal.rest_from_last_year);
    });
  }
});
