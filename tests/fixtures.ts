// Builds the engine's input from the generated dataset's "ideal extraction", without a database.
import demo from "@data/demo.json";
import type { ComparisonInput, Issue, Quote, Vendor } from "@/lib/engine/comparison";
import { DEFAULT_RULES } from "@/lib/engine/questionnaire";
import type { Contract } from "@/lib/engine/scenario";
import { withDefaults, type Line } from "@/lib/engine/types";
import { issuesClosedBy, resolveExtraction, type ContractInfo } from "@/lib/extract/resolve";
import { asExtraction } from "@/lib/extract/schema";

export const TODAY = "2026-10-28";

export function fixtureInput(opts: { withClarifications?: boolean } = {}) {
  const lines: Line[] = demo.lines.map((l) => ({ ...l, id: `L${l.line_no}` }) as Line);
  const lineId = (n: number) => `L${n}`;
  const vendors: Vendor[] = ["V1", "V2", "V3", "V4", "V5"].map((code) => ({
    id: code.toLowerCase(), code, name: code, status: "replied",
    payment_days: null, validity_days: null, lead_time_days: null, freight: null, freight_note: null, discount: null,
  }));
  const contracts = demo.contracts as ContractInfo[];

  let quotes: Quote[] = [];
  let issues: (Issue & { line_no: number | null })[] = [];
  const answers: ComparisonInput["answers"] = [];
  const certificates: ComparisonInput["certificates"] = [];
  const assumptions = withDefaults({}, demo.fx_rate);
  let seq = 0;

  const apply = (raw: unknown, kind: "reply" | "clarification") => {
    const x = asExtraction(raw);
    const code = (raw as { vendor_code: string }).vendor_code;
    const r = resolveExtraction(x, { vendorCode: code, lines, contracts, requestedPaymentDays: 60, today: TODAY, kind });
    const v = vendors.find((x) => x.code === code)!;
    if (kind === "clarification") {
      const closed = new Set(issuesClosedBy(r, issues.filter((i) => i.vendor_id === v.id && i.status !== "resolved"), 60));
      issues = issues.map((i) => (closed.has(i.id) ? { ...i, status: "resolved" } : i));
      const newLines = new Set(r.quotes.map((q) => q.line_no));
      quotes = quotes.filter((q) => !(q.vendor_id === v.id && newLines.has(Number(q.line_item_id.slice(1)))));
    }
    for (const q of r.quotes) {
      quotes.push({
        id: `q${++seq}`, vendor_id: v.id, line_item_id: lineId(q.line_no), message_id: null, raw: q.raw,
        source: null, confidence: q.confidence, provenance: q.provenance, contract_ref: q.contract_ref, review: "auto",
        created_at: TODAY,
      });
    }
    for (const i of r.issues) {
      issues.push({ id: `i${++seq}`, vendor_id: v.id, line_item_id: i.line_no ? lineId(i.line_no) : null, line_no: i.line_no, kind: i.kind, title: i.title, status: "open" });
    }
    if (kind === "reply") {
      v.payment_days = r.terms.payment_days;
      v.lead_time_days = r.terms.lead_time_days;
      v.validity_days = r.terms.validity_days;
      v.freight = r.terms.freight;
      v.discount = r.terms.discount;
      for (const a of r.answers) answers.push({ vendor_id: v.id, ...a });
      for (const c of r.certificates) certificates.push({ vendor_id: v.id, name: c.name, valid_until: c.valid_until });
    } else if (r.terms.payment_days !== null) {
      v.payment_days = r.terms.payment_days;
    }
    if (r.freight) assumptions.freight[code] = r.freight;
  };

  for (const r of demo.ideal_extraction.replies) apply(r, "reply");
  if (opts.withClarifications) for (const r of demo.ideal_extraction.clarifications) apply(r, "clarification");

  const input: ComparisonInput = {
    lines, vendors, quotes, issues, answers, certificates,
    questions: demo.questions, rules: DEFAULT_RULES, assumptions,
    processedVendorIds: vendors.map((v) => v.id), today: TODAY,
  };
  const scenarioContracts: Contract[] = demo.contracts.map((c) => ({
    vendor_code: c.vendor_code, contract_no: c.contract_no, lines: c.lines.map((l) => ({ line_no: l.line_no, price: l.price })),
  }));
  return { input, contracts: scenarioContracts };
}
