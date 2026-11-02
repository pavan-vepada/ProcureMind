// Turns the server-side analysis into plain, serializable data for the comparison screen.
import { draftClarification, type ClarificationDraft } from "@/lib/clarify";
import type { getAnalysis } from "@/lib/data";
import { runScenario } from "@/lib/engine/scenario";
import type { Step } from "@/lib/engine/types";
import { asQuoted } from "@/lib/quote-text";

export type CellView = {
  status: "ok" | "flagged" | "missing" | "unreadable" | "no_history" | "pending";
  quoteId: string | null;
  avg: number | null;
  p1: number | null;
  p2: number | null;
  steps1: Step[];
  steps2: Step[];
  quoted: string | null;
  badges: string[];
  provenance: string | null;
  confidence: string | null;
  issueIds: string[];
  issueTitles: string[];
};

export type RowView = {
  line: { id: string; line_no: number; item_code: string; description: string; ply: number; category: string; qty_p1: number; qty_p2: number; is_new: boolean };
  cheapest: string | null;
  cells: Record<string, CellView>;
};

export type VendorView = {
  id: string; code: string; name: string; email: string; format: string; status: string; processed: boolean;
  linesQuoted: number; total: number; score: number; answered: boolean; passed: boolean; valid: boolean; invalidReasons: string[];
  payment_days: number | null; lead_time_days: number | null; freight: string | null; openIssues: number; askable: number;
  discount: { pct: number; condition: string } | null;
};

export function compareData(a: Awaited<ReturnType<typeof getAnalysis>>) {
  const issueById = new Map(a.issues.map((i) => [i.id, i]));
  const rows: RowView[] = a.comparison.rows.map((r) => ({
    line: {
      id: r.line.id, line_no: r.line.line_no, item_code: r.line.item_code, description: r.line.description, ply: r.line.ply,
      category: r.line.category, qty_p1: r.line.qty_p1, qty_p2: r.line.qty_p2, is_new: r.line.is_new,
    },
    cheapest: r.cheapest,
    cells: Object.fromEntries(
      Object.entries(r.cells).map(([code, c]) => [
        code,
        {
          status: c.status, quoteId: c.quote?.id ?? null, avg: c.avg, p1: c.p1?.value ?? null, p2: c.p2?.value ?? null,
          steps1: c.p1?.steps ?? [], steps2: c.p2?.steps ?? [], quoted: c.quote ? asQuoted(c.quote.raw) : null, badges: c.badges,
          provenance: c.quote?.provenance ?? null, confidence: c.quote?.confidence ?? null,
          issueIds: c.issueIds, issueTitles: c.issueIds.map((id) => issueById.get(id)?.title ?? ""),
        } satisfies CellView,
      ]),
    ),
  }));

  const vendors: VendorView[] = a.comparison.vendors.map((s) => {
    const v = a.vendors.find((x) => x.id === s.vendor.id)!;
    const open = a.issues.filter((i) => i.vendor_id === v.id && i.status === "open");
    return {
      id: v.id, code: v.code, name: v.name, email: v.email, format: v.reply_format, status: v.status, processed: s.processed,
      linesQuoted: s.linesQuoted, total: s.total, score: s.questionnaire.score, answered: s.questionnaire.answered,
      passed: s.questionnaire.passed, valid: s.valid, invalidReasons: s.invalidReasons,
      payment_days: v.payment_days, lead_time_days: v.lead_time_days, freight: v.freight,
      openIssues: open.length, askable: open.filter((i) => i.askable).length,
      discount: v.discount ? { pct: v.discount.pct, condition: v.discount.condition } : null,
    };
  });

  const drafts: Record<string, ClarificationDraft> = {};
  for (const v of a.vendors) {
    const d = draftClarification(a.rfx, v, a.issues, a.input.lines);
    if (d.items.length) drafts[v.code] = d;
  }

  return {
    rfxId: a.rfx.id,
    lineCount: a.input.lines.length,
    rows,
    vendors,
    drafts,
    assumptions: a.input.assumptions,
    openIssues: a.issues.filter((i) => i.status === "open").length,
    // Recomputed with today's data and assumptions, so saved scenarios always reflect the latest numbers.
    scenarios: a.scenarios.map((s) => ({ id: s.id, name: s.name, spec: s.spec, total: runScenario(a.input, a.comparison, a.scenarioContracts, s.spec).total, created_at: s.created_at })),
    chat: a.chat,
    hasMemo: a.hasMemo,
  };
}

export type CompareData = ReturnType<typeof compareData>;
