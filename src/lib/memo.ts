// Award memo (FR-6.2): code assembles every number; the AI writes only the connecting prose, number-checked.
import { aiConfigured, aiModel, openai } from "@/lib/ai/client";
import { numbersAreGrounded } from "@/lib/ask/numbers";
import type { Comparison, ComparisonInput } from "@/lib/engine/comparison";
import type { ScenarioResult } from "@/lib/engine/scenario";
import { inr, money, pct } from "@/lib/format";
import type { IssueRecord, Rfx } from "@/lib/types";

export type MemoRow = { line_no: number; description: string; vendor: string; qty: number; unit_price: number; total: number; quote_id: string | null };

export type MemoContent = {
  scenario_name: string;
  prepared_day: number;
  prepared_at?: string;
  total: number;
  savings_vs_last_year: { amount: number; pct: number; lines: number } | null;
  savings_vs_single: { amount: number; vendor: string } | null;
  award: { code: string; name: string; lines: number[]; value: number; share: number }[];
  excluded: { code: string; name: string; reason: string }[];
  why: string;
  why_checked: boolean;
  rules: { text: string[]; locked_at: string | null };
  risks: string[];
  rows: MemoRow[];
};

export async function buildMemo(
  rfx: Rfx, r: ScenarioResult, input: ComparisonInput, comparison: Comparison, issues: IssueRecord[], opts: { ai?: boolean } = {},
): Promise<MemoContent> {
  const vendorByCode = new Map(input.vendors.map((v) => [v.code, v]));
  const rows: MemoRow[] = r.rows
    .filter((x) => x.vendor && x.total !== null)
    .map((x) => {
      const v = vendorByCode.get(x.vendor!)!;
      const line = input.lines.find((l) => l.line_no === x.line_no)!;
      const q = input.quotes.find((q) => q.vendor_id === v.id && q.line_item_id === line.id);
      return { line_no: x.line_no, description: x.description, vendor: x.vendor!, qty: x.qty, unit_price: x.unit_price!, total: x.total!, quote_id: q?.id ?? null };
    });

  const awarded = new Set(r.by_vendor.map((b) => b.code));
  const risks: string[] = [];
  for (const code of awarded) {
    const f = input.assumptions.freight[code];
    if (f?.source === "estimate") risks.push(`${vendorByCode.get(code)?.name ?? code}: freight is a buyer estimate (${inr(f.per_piece)} per piece), not quoted.`);
  }
  const kgLines = rows.filter((x) => input.quotes.find((q) => q.id === x.quote_id)?.raw.unit === "kg").map((x) => x.line_no);
  if (kgLines.length) risks.push(`${kgLines.length} awarded line${kgLines.length > 1 ? "s were" : " was"} priced per kg and converted with estimated box weights.`);
  const awardedIds = new Set([...awarded].map((c) => vendorByCode.get(c)!.id));
  const openOnAwarded = issues.filter((i) => awardedIds.has(i.vendor_id) && i.status !== "resolved");
  risks.push(openOnAwarded.length ? `${openOnAwarded.length} open flag${openOnAwarded.length > 1 ? "s" : ""} on awarded suppliers: ${openOnAwarded.slice(0, 3).map((i) => i.title).join("; ")}.` : "No open flags on the awarded suppliers.");
  for (const e of r.excluded) risks.push(`${vendorByCode.get(e.code)?.name ?? e.code} excluded: ${e.reason}.`);
  if (r.lines_uncovered.length) risks.push(`Lines ${r.lines_uncovered.join(", ")} have no eligible quote.`);

  const rules = rfx.rules;
  const ruleText = [
    `Pass: ${(rules?.required_q ?? [1, 3]).map((n) => input.questions.find((q) => q.q_no === n)?.text ?? `Q${n}`).join("; ")}; score ≥ ${rules?.min_score ?? 70}%`,
    `Basis: ₹ per piece, before GST, delivered to each plant, 1 USD = ₹${(rules?.fx_rate ?? input.assumptions.fx_rate).toFixed(2)}${rules?.fx_date ? ` (rate of ${rules.fx_date})` : ""}, volume tiers by plant`,
  ];

  let why = `${r.working.rule}. ${r.excluded.length ? `${r.excluded.map((e) => vendorByCode.get(e.code)?.name ?? e.code).join(" and ")} ${r.excluded.length > 1 ? "were" : "was"} excluded by the locked rules.` : ""} ${r.tier_lines.length ? `Combining both plants' volumes reaches a volume tier on ${r.tier_lines.length} lines.` : ""}`.trim();
  let checked = false;
  if (opts.ai !== false && aiConfigured()) {
    try {
      const res = await openai().responses.create({
        model: aiModel(),
        reasoning: { effort: "low" },
        instructions: "Write 2–3 sentences for a CFO explaining why this award is recommended. Use ONLY numbers that appear in the data; format money like ₹1.19 Cr or ₹5.0 L. No headings, no bullet points.",
        input: JSON.stringify({
          scenario: r.name, rule: r.working.rule, total: money(r.total),
          award: r.by_vendor.map((b) => ({ vendor: `${b.code} ${b.name}`, lines: b.lines.length, value: money(b.value), share: pct(b.share * 100, 0) })),
          excluded: r.excluded, volume_tier_lines: r.tier_lines.length,
          savings_vs_cheapest_single_vendor: r.savings_vs_single !== null ? money(r.savings_vs_single) : null,
          savings_vs_last_year: r.last_year ? { amount: money(r.last_year.savings), pct: pct(r.last_year.pct) } : null,
        }),
      });
      const allowed = [r.total, ...r.by_vendor.flatMap((b) => [b.value, b.share * 100, b.lines.length, Number(b.code.slice(1))]),
        ...r.excluded.map((e) => Number(e.code.slice(1))), r.tier_lines.length, 70, 30, 18,
        ...(r.savings_vs_single !== null ? [r.savings_vs_single] : []),
        ...(r.last_year ? [r.last_year.savings, r.last_year.pct, r.last_year.comparable_lines] : [])];
      const prose = res.output_text.trim();
      if (prose && numbersAreGrounded(prose, allowed).ok) {
        why = prose;
        checked = true;
      }
    } catch {
      // Keep the code-written explanation.
    }
  }

  return {
    scenario_name: r.name,
    prepared_day: rfx.demo_day,
    prepared_at: new Date().toISOString(),
    total: r.total,
    savings_vs_last_year: r.last_year ? { amount: r.last_year.savings, pct: r.last_year.pct, lines: r.last_year.comparable_lines } : null,
    savings_vs_single: r.cheapest_single && r.savings_vs_single !== null ? { amount: r.savings_vs_single, vendor: vendorByCode.get(r.cheapest_single.code)?.name ?? r.cheapest_single.code } : null,
    award: r.by_vendor,
    excluded: r.excluded.map((e) => ({ ...e, name: vendorByCode.get(e.code)?.name ?? e.code })),
    why,
    why_checked: checked,
    rules: { text: ruleText, locked_at: rfx.rules_locked_at },
    risks,
    rows,
  };
  void comparison;
}
