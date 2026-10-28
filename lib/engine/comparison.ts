import { normalize, type Normalized } from "./normalize";
import { evaluateQuestionnaire, type Answer, type Certificate, type Question, type QuestionnaireResult, type Rules } from "./questionnaire";
import type { Assumptions, Discount, Line, RawQuote, VendorTerms } from "./types";

export type Vendor = {
  id: string;
  code: string;
  name: string;
  status: string;
  payment_days: number | null;
  validity_days: number | null;
  lead_time_days: number | null;
  freight: "included" | "extra" | "unclear" | null;
  freight_note: string | null;
  discount: Discount | null;
};

export type Source = {
  attachment_id: string | null;
  attachment: string | null;
  kind: string;
  ref: string;
  snippet: string;
  page: number | null;
  cell: string | null;
  paragraph: number | null;
  bbox: [number, number, number, number] | null;
};

export type Quote = {
  id: string;
  vendor_id: string;
  line_item_id: string;
  message_id: string | null;
  raw: RawQuote;
  source: Source | null;
  confidence: "high" | "medium" | "low";
  provenance: "vendor" | "contract" | "clarification" | "manual";
  contract_ref: string | null;
  review: "auto" | "accepted" | "edited";
  created_at: string;
};

export type Issue = {
  id: string;
  vendor_id: string;
  line_item_id: string | null;
  kind: string;
  title: string;
  status: "open" | "asked" | "resolved";
};

export type ComparisonInput = {
  lines: Line[];
  vendors: Vendor[];
  quotes: Quote[]; // current values only
  issues: Issue[];
  answers: Answer[];
  certificates: Certificate[];
  questions: Question[];
  rules: Rules;
  assumptions: Assumptions;
  processedVendorIds: string[];
  today: string; // YYYY-MM-DD
};

export type CellStatus = "ok" | "flagged" | "missing" | "unreadable" | "no_history" | "pending";

export type Badge = "per-box fixed" | "per-1000" | "estimate" | "$→₹" | "GST removed" | "tier" | "contract"
  | "clarification" | "edited" | "freight est." | "discount?";

export type Cell = {
  vendorCode: string;
  status: CellStatus;
  quote: Quote | null;
  p1: Normalized | null;
  p2: Normalized | null;
  avg: number | null;
  total: number | null;
  badges: Badge[];
  issueIds: string[];
};

export type Row = { line: Line; cells: Record<string, Cell>; cheapest: string | null };

export type VendorSummary = {
  vendor: Vendor;
  processed: boolean;
  linesQuoted: number;
  total: number;
  questionnaire: QuestionnaireResult;
  valid: boolean;
  invalidReasons: string[];
  openIssues: number;
};

export type Comparison = { rows: Row[]; vendors: VendorSummary[]; openIssueCount: number };

export const terms = (v: Vendor): VendorTerms => ({ code: v.code, freight: v.freight, discount: v.discount });

/** Price function used by the matrix and the scenario engine: normalized ₹/piece for a vendor, line and volume. */
export function makePricer(input: ComparisonInput) {
  const byKey = new Map(input.quotes.map((q) => [`${q.vendor_id}|${q.line_item_id}`, q]));
  const vendorByCode = new Map(input.vendors.map((v) => [v.code, v]));
  return (vendorCode: string, line: Line, qty: number): Normalized | null => {
    const v = vendorByCode.get(vendorCode);
    const q = v && byKey.get(`${v.id}|${line.id}`);
    return v && q ? normalize(q.raw, line, qty, terms(v), input.assumptions) : null;
  };
}

function badgesFor(q: Quote, p1: Normalized, v: Vendor, line: Line, a: Assumptions): Badge[] {
  const b: Badge[] = [];
  if (q.raw.unit === "bundle") b.push("per-box fixed");
  if (q.raw.unit === "per_1000") b.push("per-1000");
  if (q.raw.unit === "kg") b.push("estimate");
  if (q.raw.currency === "USD") b.push("$→₹");
  if (q.raw.gst_included) b.push("GST removed");
  if (q.raw.tiers.some((t) => Math.max(line.qty_p1, line.qty_p2) >= t.min_qty || line.qty_p1 + line.qty_p2 >= t.min_qty)) b.push("tier");
  if (q.provenance === "contract") b.push("contract");
  if (q.provenance === "clarification") b.push("clarification");
  if (q.provenance === "manual" || q.review === "edited") b.push("edited");
  if (p1.freightEstimate) b.push("freight est.");
  if (v.discount && (a.discount_mode[v.code] ?? "not_applied") === "not_applied") b.push("discount?");
  return b;
}

export function buildComparison(input: ComparisonInput): Comparison {
  const price = makePricer(input);
  const processed = new Set(input.processedVendorIds);
  const openIssues = input.issues.filter((i) => i.status !== "resolved");

  const summaries: VendorSummary[] = input.vendors.map((v) => {
    const questionnaire = evaluateQuestionnaire(v.id, input.questions, input.answers, input.certificates, input.rules, input.today);
    const isProcessed = processed.has(v.id);
    return {
      vendor: v,
      processed: isProcessed,
      linesQuoted: 0,
      total: 0,
      questionnaire,
      valid: isProcessed && questionnaire.passed,
      invalidReasons: isProcessed ? questionnaire.failures : ["Reply not processed yet"],
      openIssues: openIssues.filter((i) => i.vendor_id === v.id).length,
    };
  });
  const summaryByCode = new Map(summaries.map((s) => [s.vendor.code, s]));

  const rows: Row[] = input.lines.map((line) => {
    const cells: Record<string, Cell> = {};
    for (const v of input.vendors) {
      const lineIssues = openIssues.filter((i) => i.vendor_id === v.id && i.line_item_id === line.id);
      const q = input.quotes.find((x) => x.vendor_id === v.id && x.line_item_id === line.id) ?? null;
      const p1 = price(v.code, line, line.qty_p1);
      const p2 = price(v.code, line, line.qty_p2);
      let status: CellStatus;
      if (!processed.has(v.id) && !q) status = "pending";
      else if (!q || !p1 || !p2) {
        const kinds = lineIssues.map((i) => i.kind);
        status = kinds.includes("unreadable") ? "unreadable" : kinds.includes("no_history") ? "no_history" : "missing";
      } else status = lineIssues.length ? "flagged" : "ok";

      const total = p1 && p2 ? p1.value * line.qty_p1 + p2.value * line.qty_p2 : null;
      cells[v.code] = {
        vendorCode: v.code,
        status,
        quote: q,
        p1,
        p2,
        avg: total !== null ? total / (line.qty_p1 + line.qty_p2) : null,
        total,
        badges: q && p1 ? badgesFor(q, p1, v, line, input.assumptions) : [],
        issueIds: lineIssues.map((i) => i.id),
      };
      const s = summaryByCode.get(v.code)!;
      if (total !== null) {
        s.linesQuoted += 1;
        s.total += total;
      }
    }
    let cheapest: string | null = null;
    for (const [code, c] of Object.entries(cells)) {
      if (c.avg === null || !summaryByCode.get(code)!.valid) continue;
      if (cheapest === null || c.avg < cells[cheapest].avg!) cheapest = code;
    }
    return { line, cells, cheapest };
  });

  return { rows, vendors: summaries, openIssueCount: openIssues.filter((i) => i.status === "open").length };
}
