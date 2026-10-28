// Every sample dataset's recorded reading must resolve cleanly against its own lines, and every file must exist.
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DATASETS } from "@/lib/demo/datasets";
import { buildComparison, type Vendor } from "@/lib/engine/comparison";
import { DEFAULT_RULES } from "@/lib/engine/questionnaire";
import { withDefaults, type Line } from "@/lib/engine/types";
import { resolveExtraction } from "@/lib/extract/resolve";
import { asExtraction } from "@/lib/extract/schema";

describe.each(Object.values(DATASETS).map((d) => [d.key, d] as const))("sample dataset %s", (_key, ds) => {
  const lines = ds.lines.map((l) => ({ ...l, id: `L${l.line_no}` }) as Line);

  it("has a reply and a recorded reading for every vendor, with files on disk", () => {
    for (const v of ds.vendors) {
      const reply = ds.replies.find((r) => r.vendor_code === v.code)!;
      expect(reply, v.code).toBeTruthy();
      for (const a of reply.attachments) expect(existsSync(`seed/files/${a.filename}`), a.filename).toBe(true);
      expect((ds.ideal as { vendor_code: string }[]).some((x) => x.vendor_code === v.code)).toBe(true);
    }
  });

  it("resolves every reading into prices for real lines and a usable comparison", () => {
    const vendors: Vendor[] = ds.vendors.map((v) => ({
      id: v.code, code: v.code, name: v.name, status: "replied", payment_days: null, validity_days: null, lead_time_days: null, freight: null, freight_note: null, discount: null,
    }));
    const quotes = [];
    let seq = 0;
    for (const x of ds.ideal as { vendor_code: string }[]) {
      const r = resolveExtraction(asExtraction(x), {
        vendorCode: x.vendor_code, lines, contracts: ds.contracts.map((c) => ({ ...c, lines: c.lines })), requestedPaymentDays: 60, today: "2026-10-28", kind: "reply",
      });
      expect(r.quotes.length, x.vendor_code).toBeGreaterThan(0);
      for (const q of r.quotes) {
        quotes.push({ id: `q${++seq}`, vendor_id: x.vendor_code, line_item_id: `L${q.line_no}`, message_id: null, raw: q.raw, source: null, confidence: q.confidence, provenance: q.provenance, contract_ref: null, review: "auto" as const, created_at: "" });
      }
    }
    const c = buildComparison({
      lines, vendors, quotes, issues: [], answers: [], certificates: [], questions: [], rules: DEFAULT_RULES,
      assumptions: withDefaults({}), processedVendorIds: vendors.map((v) => v.id), today: "2026-10-28",
    });
    for (const row of c.rows) for (const cell of Object.values(row.cells)) if (cell.avg !== null) expect(cell.avg).toBeGreaterThan(0.5);
  });
});
