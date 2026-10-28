import { describe, expect, it } from "vitest";
import demo from "@data/demo.json";
import { buildComparison } from "@/lib/engine/comparison";
import { normalize } from "@/lib/engine/normalize";
import { evaluateQuestionnaire } from "@/lib/engine/questionnaire";
import { runScenario, type ScenarioSpec } from "@/lib/engine/scenario";
import { withDefaults } from "@/lib/engine/types";
import { weightKg } from "@/lib/engine/weight";
import { fixtureInput } from "../fixtures";

const spec = (over: Partial<ScenarioSpec>): ScenarioSpec => ({
  name: "test", passed_only: true, exclude_vendors: [], only_vendors: [], rule: "cheapest_per_line",
  single_vendor: null, volume: "per_plant", price_match: null, line_filter: null, ...over,
});

describe("normalization against the answer key (FR-3.6, FR-3.7)", () => {
  const { input } = fixtureInput({ withClarifications: true });
  const comparison = buildComparison(input);

  it("gets every vendor × line × plant price right to the paisa", () => {
    let checked = 0;
    for (const key of demo.answer_key) {
      const row = comparison.rows.find((r) => r.line.line_no === key.line_no)!;
      for (const [code, plants] of Object.entries(key.vendors)) {
        const cell = row.cells[code];
        if (plants.p1 === null) {
          expect(cell.p1, `${code} line ${key.line_no} should be unreadable`).toBeNull();
          continue;
        }
        expect(cell.p1!.value, `${code} line ${key.line_no} plant 1`).toBeCloseTo(plants.p1, 2);
        expect(cell.p2!.value, `${code} line ${key.line_no} plant 2`).toBeCloseTo(plants.p2!, 2);
        checked += 2;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(290);
  });

  it("matches the dataset generator's box-weight estimate", () => {
    for (const l of demo.lines) expect(weightKg(l as Parameters<typeof weightKg>[0])).toBeCloseTo(l.est_weight_kg, 4);
  });

  it("explains the V1 per-box trap as a conversion chain", () => {
    const line = input.lines[1];
    const n = normalize({ price: 1850, currency: "INR", unit: "bundle", bundle_size: 100, gst_included: false, tiers: [] },
      line, line.qty_p1, { code: "V1", freight: "included", discount: null }, withDefaults({}));
    expect(n.value).toBeCloseTo(18.5, 6);
    expect(n.steps.map((s) => s.label)).toContain("1 box = 100 pieces → per piece");
  });
});

describe("planted traps before clarifications (PRD §8)", () => {
  const { input } = fixtureInput();
  const c = buildComparison(input);
  const s = (code: string) => c.vendors.find((v) => v.vendor.code === code)!;

  it("V3 quotes 27 of 30 and fails the questionnaire", () => {
    expect(s("V3").linesQuoted).toBe(27);
    expect(s("V3").questionnaire.passed).toBe(false);
  });

  it("V4 has 2 unreadable lines and an expired ISO certificate", () => {
    expect(s("V4").linesQuoted).toBe(28);
    expect(s("V4").invalidReasons.join(" ")).toMatch(/ISO 9001 certificate expired/);
    const unreadable = c.rows.filter((r) => r.cells.V4.status === "unreadable").map((r) => r.line.line_no);
    expect(unreadable).toEqual([23, 28]);
  });

  it("V5 fills the rest from contract #2025-V5 except the 2 new lines", () => {
    const contract = c.rows.filter((r) => r.cells.V5.quote?.provenance === "contract").length;
    expect(contract).toBeGreaterThan(10);
    const noHistory = c.rows.filter((r) => r.cells.V5.status === "no_history").map((r) => r.line.line_no);
    expect(noHistory).toEqual([29, 30]);
  });

  it("V1, V2 and V5 pass; V3 and V4 don't", () => {
    expect(c.vendors.filter((v) => v.valid).map((v) => v.vendor.code)).toEqual(["V1", "V2", "V5"]);
  });
});

describe("questionnaire rules (FR-4.6)", () => {
  const q = [{ q_no: 1, text: "Valid ISO 9001 certificate", points: 50, required: true }, { q_no: 2, text: "Other", points: 50, required: false }];
  const rules = { required_q: [1], min_score: 70 };

  it("passes Q1 from a valid ISO certificate even if the answer list skipped it", () => {
    const r = evaluateQuestionnaire("v", q, [{ vendor_id: "v", q_no: 2, met: true, answer: "yes" }], [{ vendor_id: "v", name: "ISO 9001", valid_until: "2027-08-31" }], rules, "2026-10-28");
    expect(r.passed).toBe(true);
    expect(r.score).toBe(100);
  });

  it("fails Q1 when the only ISO certificate has expired, even if the vendor says yes", () => {
    const r = evaluateQuestionnaire("v", q, [{ vendor_id: "v", q_no: 1, met: true, answer: "yes" }, { vendor_id: "v", q_no: 2, met: true, answer: "yes" }], [{ vendor_id: "v", name: "ISO 9001:2015", valid_until: "2026-03-31" }], rules, "2026-10-28");
    expect(r.passed).toBe(false);
    expect(r.failures[0]).toMatch(/expired on 31 Mar 2026/);
  });
});

describe("scenario engine (FR-4.10, FR-5.5)", () => {
  const { input, contracts } = fixtureInput({ withClarifications: true });
  const c = buildComparison(input);

  it("splits by line among passing vendors only", () => {
    const r = runScenario(input, c, contracts, spec({}));
    expect(r.eligible).toEqual(["V1", "V2", "V5"]);
    expect(r.excluded.map((e) => e.code)).toEqual(["V3", "V4"]);
    expect(r.lines_uncovered).toEqual([]);
    expect(r.total).toBeCloseTo(r.rows.reduce((s, x) => s + x.total!, 0), 6);
    expect(r.savings_vs_single!).toBeGreaterThan(0);
  });

  it("combining plant volumes unlocks V2's tier and lowers the total", () => {
    const perPlant = runScenario(input, c, contracts, spec({}));
    const combined = runScenario(input, c, contracts, spec({ volume: "combined" }));
    expect(combined.total).toBeLessThan(perPlant.total);
    expect(combined.tier_lines.length).toBeGreaterThan(0);
  });

  it("a price-match what-if never raises a total", () => {
    const base = runScenario(input, c, contracts, spec({}));
    const matched = runScenario(input, c, contracts, spec({ price_match: { vendor: "V1", ply: 5, category: null } }));
    expect(matched.total).toBeLessThanOrEqual(base.total + 1e-6);
    expect(matched.rows.some((r) => r.matched)).toBe(true);
  });

  it("reports savings against last year's contracts", () => {
    const r = runScenario(input, c, contracts, spec({}));
    expect(r.last_year!.comparable_lines).toBe(28);
    expect(r.last_year!.savings).toBeGreaterThan(0);
  });
});
