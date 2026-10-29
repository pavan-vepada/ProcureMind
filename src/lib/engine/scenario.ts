import { z } from "zod";
import { makePricer, type Comparison, type ComparisonInput } from "./comparison";
import type { Line } from "./types";

const VendorCode = z.enum(["V1", "V2", "V3", "V4", "V5"]);
const CategoryEnum = z.enum(["rsc", "heavy", "tray", "partition", "pad", "sheet"]);

/** What the AI may ask the engine to compute. It never computes numbers itself (FR-5.5). */
export const ScenarioSpec = z.object({
  name: z.string().describe("Short name for this scenario, e.g. 'Split by line, passing vendors'"),
  passed_only: z.boolean().describe("Only vendors that pass the locked questionnaire rules"),
  exclude_vendors: z.array(VendorCode).describe("Vendors to leave out"),
  only_vendors: z.array(VendorCode).describe("If not empty, consider only these vendors"),
  rule: z
    .enum(["cheapest_per_line", "single_vendor", "cheapest_single_vendor"])
    .describe("cheapest_per_line = split award by line; single_vendor = everything to one vendor; cheapest_single_vendor = the cheapest vendor that can supply everything"),
  single_vendor: VendorCode.nullable().describe("Vendor for rule single_vendor, else null"),
  volume: z.enum(["per_plant", "combined"]).describe("combined = price both plants' volumes together (may unlock volume tiers)"),
  price_match: z
    .object({
      vendor: VendorCode,
      ply: z.number().int().nullable(),
      category: CategoryEnum.nullable(),
    })
    .nullable()
    .describe("What-if: this vendor matches the lowest competing price on the matching lines"),
  line_filter: z
    .object({ ply: z.number().int().nullable(), category: CategoryEnum.nullable() })
    .nullable()
    .describe("Restrict the analysis to these lines, else null for all 30"),
});
export type ScenarioSpec = z.infer<typeof ScenarioSpec>;

export type Contract = { vendor_code: string; contract_no: string; lines: { line_no: number; price: number }[] };

export type ScenarioRow = {
  line_no: number;
  description: string;
  vendor: string | null;
  qty: number;
  unit_price: number | null;
  total: number | null;
  matched: boolean;
};

export type ScenarioResult = {
  name: string;
  spec: ScenarioSpec;
  rows: ScenarioRow[];
  by_vendor: { code: string; name: string; lines: number[]; value: number; share: number }[];
  total: number;
  lines_in_scope: number;
  lines_uncovered: number[];
  eligible: string[];
  excluded: { code: string; reason: string }[];
  cheapest_single: { code: string; total: number } | null;
  savings_vs_single: number | null;
  last_year: { comparable_lines: number; last_year_total: number; scenario_total: number; savings: number; pct: number } | null;
  tier_lines: number[];
  working: { data: string; filters: string[]; rule: string; formula: string };
};

const matches = (l: Line, f: { ply: number | null; category: string | null } | null) =>
  !f || ((f.ply === null || l.ply === f.ply) && (f.category === null || l.category === f.category));

/** Computes an award scenario exactly, from stored normalized values (FR-4.10, FR-5.5). */
export function runScenario(
  input: ComparisonInput,
  comparison: Comparison,
  contracts: Contract[],
  spec: ScenarioSpec,
): ScenarioResult {
  const price = makePricer(input);
  const summary = new Map(comparison.vendors.map((s) => [s.vendor.code, s]));

  const excluded: { code: string; reason: string }[] = [];
  const eligible: string[] = [];
  for (const s of comparison.vendors) {
    const code = s.vendor.code;
    if (!s.processed) excluded.push({ code, reason: "reply not processed yet" });
    else if (spec.only_vendors.length && !spec.only_vendors.includes(code as never)) excluded.push({ code, reason: "not in the selected suppliers" });
    else if (spec.exclude_vendors.includes(code as never)) excluded.push({ code, reason: "left out on request" });
    else if (spec.passed_only && !s.valid) excluded.push({ code, reason: s.invalidReasons[0] ?? "fails the questionnaire rules" });
    else eligible.push(code);
  }

  const lines = input.lines.filter((l) => matches(l, spec.line_filter));
  const cost = (code: string, l: Line): number | null => {
    if (spec.volume === "combined") {
      const p = price(code, l, l.qty_p1 + l.qty_p2);
      return p ? p.value * (l.qty_p1 + l.qty_p2) : null;
    }
    const a = price(code, l, l.qty_p1);
    const b = price(code, l, l.qty_p2);
    return a && b ? a.value * l.qty_p1 + b.value * l.qty_p2 : null;
  };

  // Line costs per eligible vendor, with the optional price-match what-if applied.
  const costs = new Map<number, Map<string, { cost: number; matched: boolean }>>();
  for (const l of lines) {
    const m = new Map<string, { cost: number; matched: boolean }>();
    for (const code of eligible) {
      const c = cost(code, l);
      if (c !== null) m.set(code, { cost: c, matched: false });
    }
    const pm = spec.price_match;
    if (pm && m.has(pm.vendor) && matches(l, pm)) {
      const others = [...m.entries()].filter(([c]) => c !== pm.vendor).map(([, v]) => v.cost);
      const lowest = Math.min(...others);
      if (others.length && lowest < m.get(pm.vendor)!.cost) m.set(pm.vendor, { cost: lowest, matched: true });
    }
    costs.set(l.line_no, m);
  }

  const vendorTotal = (code: string) => {
    let total = 0;
    let covered = 0;
    for (const l of lines) {
      const c = costs.get(l.line_no)!.get(code);
      if (c) {
        total += c.cost;
        covered += 1;
      }
    }
    return { total, covered };
  };
  const full = eligible
    .map((code) => ({ code, ...vendorTotal(code) }))
    .filter((v) => v.covered === lines.length)
    .sort((a, b) => a.total - b.total);
  const cheapestSingle = full[0] ? { code: full[0].code, total: full[0].total } : null;

  let pick: (l: Line) => string | null;
  if (spec.rule === "cheapest_per_line") {
    pick = (l) => {
      const m = costs.get(l.line_no)!;
      let best: string | null = null;
      for (const [code, v] of m) if (best === null || v.cost < m.get(best)!.cost) best = code;
      return best;
    };
  } else {
    const chosen = spec.rule === "single_vendor" ? spec.single_vendor : cheapestSingle?.code ?? null;
    pick = (l) => (chosen && costs.get(l.line_no)!.has(chosen) ? chosen : null);
  }

  const rows: ScenarioRow[] = lines.map((l) => {
    const code = pick(l);
    const c = code ? costs.get(l.line_no)!.get(code)! : null;
    const qty = l.qty_p1 + l.qty_p2;
    return {
      line_no: l.line_no,
      description: l.description,
      vendor: code,
      qty,
      unit_price: c ? c.cost / qty : null,
      total: c ? c.cost : null,
      matched: c?.matched ?? false,
    };
  });
  const total = rows.reduce((s, r) => s + (r.total ?? 0), 0);

  const byVendor = new Map<string, { lines: number[]; value: number }>();
  for (const r of rows) {
    if (!r.vendor) continue;
    const e = byVendor.get(r.vendor) ?? { lines: [], value: 0 };
    e.lines.push(r.line_no);
    e.value += r.total!;
    byVendor.set(r.vendor, e);
  }

  // Last year: the lowest contract price per line that existed then, at this year's volumes.
  const lastYearPrice = new Map<number, number>();
  for (const c of contracts)
    for (const cl of c.lines)
      lastYearPrice.set(cl.line_no, Math.min(lastYearPrice.get(cl.line_no) ?? Infinity, cl.price));
  const comparable = rows.filter((r) => r.total !== null && lastYearPrice.has(r.line_no));
  const lyTotal = comparable.reduce((s, r) => s + lastYearPrice.get(r.line_no)! * r.qty, 0);
  const scTotal = comparable.reduce((s, r) => s + r.total!, 0);

  // Lines where combining volumes reaches a vendor's tier that neither plant reaches alone.
  const tierLines =
    spec.volume === "combined"
      ? rows
          .filter((r) => {
            const l = lines.find((x) => x.line_no === r.line_no)!;
            const q = input.quotes.find((x) => x.line_item_id === l.id && input.vendors.find((v) => v.id === x.vendor_id)?.code === r.vendor);
            return !!q?.raw.tiers.some((t) => l.qty_p1 + l.qty_p2 >= t.min_qty && l.qty_p1 < t.min_qty && l.qty_p2 < t.min_qty);
          })
          .map((r) => r.line_no)
      : [];

  const filters: string[] = [];
  if (spec.passed_only) filters.push("Only suppliers that pass the questionnaire rules locked before sending");
  const nameOf = (code: string) => summary.get(code)?.vendor.name ?? code;
  for (const e of excluded) filters.push(`${nameOf(e.code)} left out: ${e.reason}`);
  if (spec.line_filter) filters.push(`Lines: ${[spec.line_filter.ply && `${spec.line_filter.ply}-ply`, spec.line_filter.category].filter(Boolean).join(" ")}`);
  if (spec.price_match) filters.push(`What-if: ${nameOf(spec.price_match.vendor)} matches the lowest competing price on ${[spec.price_match.ply && `${spec.price_match.ply}-ply`, spec.price_match.category].filter(Boolean).join(" ") || "all"} lines`);

  const ruleText = {
    cheapest_per_line: "For each line, award to the lowest delivered price per piece among eligible suppliers",
    single_vendor: `Award every line to ${spec.single_vendor ? nameOf(spec.single_vendor) : "one supplier"}`,
    cheapest_single_vendor: "Award everything to the eligible supplier with the lowest total that can supply every line",
  }[spec.rule];

  return {
    name: spec.name,
    spec,
    rows,
    by_vendor: [...byVendor.entries()]
      .map(([code, e]) => ({ code, name: summary.get(code)!.vendor.name, lines: e.lines, value: e.value, share: total ? e.value / total : 0 }))
      .sort((a, b) => b.value - a.value),
    total,
    lines_in_scope: lines.length,
    lines_uncovered: rows.filter((r) => !r.vendor).map((r) => r.line_no),
    eligible,
    excluded,
    cheapest_single: cheapestSingle,
    savings_vs_single: cheapestSingle ? cheapestSingle.total - total : null,
    last_year: comparable.length
      ? { comparable_lines: comparable.length, last_year_total: lyTotal, scenario_total: scTotal, savings: lyTotal - scTotal, pct: ((lyTotal - scTotal) / lyTotal) * 100 }
      : null,
    tier_lines: tierLines,
    working: {
      data: `${lines.length} lines × ${eligible.length} eligible suppliers (${eligible.map(nameOf).join(", ") || "none"}), ₹ per piece, before GST, delivered`,
      filters,
      rule: ruleText,
      formula:
        spec.volume === "combined"
          ? "Line cost = (Plant 1 qty + Plant 2 qty) × price at the combined volume tier; total = Σ line costs"
          : "Line cost = Plant 1 qty × Plant 1 price + Plant 2 qty × Plant 2 price (each at its own tier); total = Σ line costs",
    },
  };
}
