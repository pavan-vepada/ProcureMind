// Turns one extraction into rows to save: quotes, issues, answers, certificates, terms.
// Applies the missing-value policy (PRD §5): same reply → last year's contract (only when specs match) → flag.
// Pure code, no AI, no database.
import type { FreightAssumption, Line, RawQuote } from "@/lib/engine/types";
import type { Extraction, SourceRef } from "./schema";

export type ContractInfo = {
  vendor_code: string;
  contract_no: string;
  lines: { line_no: number; spec_key: string; price: number; unit: string }[];
};

export type NewQuote = {
  line_no: number;
  raw: RawQuote;
  source: SourceRef | null;
  confidence: "high" | "medium" | "low";
  provenance: "vendor" | "contract" | "clarification";
  contract_ref: string | null;
};

export type IssueKind =
  | "mapping" | "gst" | "discount" | "missing" | "terms" | "unreadable" | "certificate" | "freight" | "no_history"
  | "low_confidence" | "injection";

export type NewIssue = {
  kind: IssueKind;
  line_no: number | null;
  title: string;
  detail: string;
  confidence: "high" | "medium" | "low" | null;
  source: SourceRef | null;
  askable: boolean;
};

export type Resolved = {
  quotes: NewQuote[];
  issues: NewIssue[];
  answers: Extraction["answers"];
  certificates: Extraction["certificates"];
  terms: {
    payment_days: number | null;
    validity_days: number | null;
    lead_time_days: number | null;
    freight: "included" | "extra" | "unclear" | null;
    discount: Extraction["discount"];
  };
  freight: FreightAssumption | null;
  linesFound: number;
};

export type ResolveContext = {
  vendorCode: string;
  lines: Line[];
  contracts: ContractInfo[];
  requestedPaymentDays: number;
  today: string;
  kind: "reply" | "clarification";
};

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Which open issues a clarification reply closes (FR-4.8): lines it now prices, terms it fixes, freight it states. */
export function issuesClosedBy(
  r: Resolved,
  open: { id: string; kind: string; line_no: number | null }[],
  requestedPaymentDays: number,
): string[] {
  const priced = new Set(r.quotes.map((q) => q.line_no));
  return open
    .filter(
      (i) =>
        (i.line_no !== null && priced.has(i.line_no) && ["missing", "no_history", "unreadable", "low_confidence"].includes(i.kind)) ||
        (i.kind === "terms" && r.terms.payment_days !== null && r.terms.payment_days >= requestedPaymentDays) ||
        (i.kind === "freight" && r.freight !== null),
    )
    .map((i) => i.id);
}

export function resolveExtraction(x: Extraction, ctx: ResolveContext): Resolved {
  const lineByNo = new Map(ctx.lines.map((l) => [l.line_no, l]));
  const provenance = ctx.kind === "clarification" ? "clarification" : "vendor";
  const quotes: NewQuote[] = [];
  const issues: NewIssue[] = [];

  // 1. Prices found in this reply.
  for (const q of x.quotes) {
    if (q.line_no === null || !lineByNo.has(q.line_no)) {
      issues.push({
        kind: "mapping", line_no: null, title: `Couldn't match “${q.vendor_label}” to an RFQ line`,
        detail: "Pick the right line from the review queue.", confidence: q.confidence, source: q.source, askable: true,
      });
      continue;
    }
    if (quotes.some((e) => e.line_no === q.line_no) || !(q.price > 0)) continue;
    quotes.push({
      line_no: q.line_no,
      raw: { price: q.price, currency: q.currency, unit: q.unit, bundle_size: q.bundle_size, gst_included: q.gst_included, tiers: q.tiers },
      source: { ...q.source, bbox: q.source.bbox && q.source.bbox.length === 4 ? q.source.bbox : null },
      confidence: q.confidence,
      provenance,
      contract_ref: null,
    });
    if (q.confidence === "low") {
      issues.push({
        kind: "low_confidence", line_no: q.line_no, title: `Hard to read: line ${q.line_no}`,
        detail: `Read as “${q.source.snippet}”. Please check against the source.`, confidence: "low", source: q.source, askable: true,
      });
    }
  }
  const gstLines = quotes.filter((q) => q.raw.gst_included).map((q) => q.line_no);
  if (gstLines.length) {
    issues.push({
      kind: "gst", line_no: null, title: `GST included on line${gstLines.length > 1 ? "s" : ""} ${gstLines.join(", ")}; removed`,
      detail: "Prices were converted to the pre-GST basis by removing 18% GST.", confidence: "high",
      source: quotes.find((q) => q.raw.gst_included)!.source, askable: false,
    });
  }

  // 2. Unreadable regions: flagged, never guessed.
  for (const n of x.unreadable_lines) {
    if (!lineByNo.has(n) || quotes.some((q) => q.line_no === n)) continue;
    issues.push({
      kind: "unreadable", line_no: n, title: `Price unreadable for line ${n}`,
      detail: "Part of the source can't be read (e.g. glare). Ask the vendor or enter the value.", confidence: "low", source: null, askable: true,
    });
  }

  if (ctx.kind === "reply") {
    const quoted = new Set(quotes.map((q) => q.line_no));
    const unreadable = new Set(x.unreadable_lines);
    const contract = ctx.contracts.find((c) => c.vendor_code === ctx.vendorCode);

    // 3. "Same as last year": fill from the contract only where the specs match.
    for (const l of ctx.lines) {
      if (quoted.has(l.line_no) || unreadable.has(l.line_no)) continue;
      if (x.rest_from_last_year) {
        const cl = contract?.lines.find((c) => c.line_no === l.line_no && c.spec_key === l.spec_key);
        if (cl && contract) {
          quotes.push({
            line_no: l.line_no,
            raw: { price: cl.price, currency: "INR", unit: "piece", bundle_size: null, gst_included: false, tiers: [] },
            source: null, confidence: "high", provenance: "contract", contract_ref: contract.contract_no,
          });
          continue;
        }
        const changed = contract?.lines.some((c) => c.line_no === l.line_no);
        issues.push({
          kind: "no_history", line_no: l.line_no,
          title: changed ? `Line ${l.line_no}: specs changed since last year` : `No history for line ${l.line_no} (new this year)`,
          detail: "“Same as last year” can't fill this line; kept out of totals until the vendor quotes it.",
          confidence: null, source: null, askable: true,
        });
      } else {
        // 4. Not quoted at all.
        issues.push({
          kind: "missing", line_no: l.line_no, title: `Line ${l.line_no} not quoted`,
          detail: `${l.description} is missing from the reply.`, confidence: null, source: null, askable: true,
        });
      }
    }

    // 5. Terms that don't match the RFQ.
    if (x.terms.payment_days !== null && x.terms.payment_days < ctx.requestedPaymentDays) {
      issues.push({
        kind: "terms", line_no: null, title: `Payment ${x.terms.payment_days} days vs ${ctx.requestedPaymentDays} requested`,
        detail: "Ask whether the vendor can match the requested payment terms.", confidence: "high", source: null, askable: true,
      });
    }
  }

  if (x.terms.freight === "extra" && x.terms.freight_amount === null) {
    issues.push({
      kind: "freight", line_no: null, title: "“Freight extra”, no amount given",
      detail: "A buyer estimate is used (labelled) until the vendor states the freight.", confidence: null, source: null, askable: true,
    });
  }
  // A conditional discount is never assumed: "orders above 50,000 pcs" could mean per order or per year.
  if (x.discount && (!x.discount.scope_clear || x.discount.min_qty !== null)) {
    issues.push({
      kind: "discount", line_no: null, title: `${x.discount.pct}% discount: confirm how it applies`,
      detail: `“${x.discount.condition}” Not applied until confirmed; you can apply it in Assumptions.`, confidence: "medium", source: null, askable: true,
    });
  }
  for (const c of x.certificates) {
    if (c.valid_until && c.valid_until < ctx.today) {
      issues.push({
        kind: "certificate", line_no: null, title: `${c.name} expired on ${fmtDate(c.valid_until)}`,
        detail: "Fails the locked rule “valid ISO 9001 certificate”. Ask for the renewed certificate.", confidence: "high", source: c.source, askable: true,
      });
    }
  }
  for (const s of x.suspicious_instructions) {
    issues.push({
      kind: "injection", line_no: null, title: "Instruction-like text in the vendor's reply",
      detail: `“${s}” was treated as data and ignored.`, confidence: "high", source: null, askable: false,
    });
  }

  return {
    quotes,
    issues,
    answers: x.answers,
    certificates: x.certificates,
    terms: {
      payment_days: x.terms.payment_days,
      validity_days: x.terms.validity_days,
      lead_time_days: x.terms.lead_time_days,
      freight: x.terms.freight,
      discount: x.discount,
    },
    freight: x.terms.freight_amount !== null ? { per_piece: x.terms.freight_amount, source: "vendor" } : null,
    linesFound: quotes.filter((q) => q.provenance !== "contract").length,
  };
}
