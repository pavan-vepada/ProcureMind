// The RFQ co-pilot (FR-1.3): drafts the RFQ from the internal request (and its volume sheet, when there is one).
// With a sheet, every number comes from the sheet. Without one, the AI proposes lines and flags what it assumed.
import { aiConfigured, aiModel, openai } from "@/lib/ai/client";
import { STANDARD_QUESTIONS, type DatasetLine } from "@/lib/demo/datasets";
import type { CopilotNote, InternalRequest, VendorRecord } from "@/lib/types";

export type SheetLine = DatasetLine;

export type DraftEvent =
  | { type: "status"; text: string }
  | { type: "line"; line: SheetLine }
  | { type: "note"; note: CopilotNote }
  | { type: "terms"; payment_days: number; validity_days: number; due_day: number }
  | { type: "cover_email"; text: string }
  | { type: "done"; source: "ai" | "prepared" }
  | { type: "error"; text: string };

const SHEET_INSTRUCTIONS = `You are a procurement co-pilot drafting an RFQ for corrugated packaging.
Output ONLY newline-delimited JSON objects, one per line, no prose, no code fences, in this order:
1. For EVERY item in the volume sheet, in sheet order: {"type":"line","item_code":"<code>","description":"<clear buyer-facing description, max 60 chars, keep size and pack info>"}
2. 2–4 notes about gaps or risks a buyer should know before sending: {"type":"note","kind":"gap"|"info","text":"<one sentence>"}
3. {"type":"terms","payment_days":<int>,"validity_days":<int>,"due_day":<int days after sending>}
4. {"type":"cover_email","text":"<short email to suppliers inviting a quote; ask them to quote per piece, ex-GST, delivered to both plants, and answer the questionnaire; say any format is fine>"}
Never change quantities, sizes, ply or GSM: those come from the sheet.`;

const FREE_INSTRUCTIONS = `You are a procurement co-pilot drafting an RFQ for corrugated packaging from a buyer's plain-language need.
Output ONLY newline-delimited JSON objects, one per line, no prose, no code fences, in this order:
1. One object per item to buy (1–20 items): {"type":"line","description":"<max 60 chars>","category":"rsc"|"heavy"|"tray"|"partition"|"pad"|"sheet","ply":3|5|7,"gsm":<int 100-200>,"bf":<int 14-28>,"flute":"B"|"C"|"E"|"BC"|"BCB","length_mm":<int>,"width_mm":<int>,"height_mm":<int, 0 for pads/sheets>,"qty_p1":<int pieces per year for Plant 1>,"qty_p2":<int pieces per year for Plant 2>,"assumed":"<comma-separated fields you had to assume, or empty>"}
   Use sizes and quantities from the request when given. When not given, propose sensible values and list them in "assumed". "heavy" means 7-ply.
2. 2–4 notes about gaps or risks, especially what you assumed: {"type":"note","kind":"gap"|"info","text":"<one sentence>"}
3. {"type":"terms","payment_days":<int>,"validity_days":<int>,"due_day":<int days after sending>}
4. {"type":"cover_email","text":"<short email to suppliers inviting a quote per piece, ex-GST, delivered to both plants; any format is fine>"}`;

export function preparedCoverEmail(company: string, dueDay: number) {
  return `Dear Supplier,

${company} invites you to quote for the corrugated packaging items in the attached RFQ, for supply to Plant 1 (Pune) and Plant 2 (Nashik).

Please quote per piece, excluding GST, delivered to both plants, and answer the 12-question supplier questionnaire. The attached Excel template is the easiest way to reply, but any format is fine.

Payment terms: 60 days. Please reply within ${dueDay} days.

Regards,
Pavan
Procurement, ${company}`;
}

const CATS = ["rsc", "heavy", "tray", "partition", "pad", "sheet"];
const int = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v) : null);

/** Streams draft events. With a sheet, falls back to a labelled prepared draft if the AI is unavailable (J5). */
export async function* draftRfq(ctx: { request: InternalRequest; company: string; vendors: VendorRecord[]; sheet: SheetLine[] | null; codePrefix: string }): AsyncGenerator<DraftEvent> {
  const sheet = ctx.sheet;
  const emitted = new Set<string>();
  const byCode = new Map((sheet ?? []).map((l) => [l.item_code, l]));
  let terms: DraftEvent | null = null;
  let cover: string | null = null;
  let source: "ai" | "prepared" = "ai";
  let freeCount = 0;

  if (aiConfigured()) {
    yield { type: "status", text: sheet ? "Reading the internal request, the volume sheet and the supplier proposals…" : "Reading your request…" };
    try {
      const sheetText = sheet?.map((l) =>
        `${l.item_code} | ${l.description} | ${l.ply}-ply ${l.gsm} GSM BF${l.bf} ${l.flute} | ${l.length_mm}×${l.width_mm}${l.height_mm ? `×${l.height_mm}` : ""} mm | P1 ${l.qty_p1} | P2 ${l.qty_p2}${l.is_new ? " | NEW" : ""}`,
      ).join("\n");
      const rfp = ctx.vendors.map((v) => `${v.code} ${v.name}: ${v.rfp_summary}`).join("\n");
      const stream = await openai().responses.create({
        model: aiModel(),
        reasoning: { effort: "low" },
        instructions: sheet ? SHEET_INSTRUCTIONS : FREE_INSTRUCTIONS,
        input: `Internal request from ${ctx.request.from}:\nSubject: ${ctx.request.subject}\n${ctx.request.body}${sheetText ? `\n\nVolume sheet:\n${sheetText}` : ""}${rfp ? `\n\nSuppliers invited:\n${rfp}` : ""}`,
        stream: true,
      });
      yield { type: "status", text: "Drafting line items…" };
      let buf = "";
      const handle = function* (raw: string): Generator<DraftEvent> {
        const s = raw.trim().replace(/^```(json)?|```$/g, "").trim();
        if (!s.startsWith("{")) return;
        let o: Record<string, unknown>;
        try {
          o = JSON.parse(s);
        } catch {
          return;
        }
        if (o.type === "line" && sheet && typeof o.item_code === "string") {
          const l = byCode.get(o.item_code);
          if (!l || emitted.has(l.item_code)) return;
          emitted.add(l.item_code);
          const d = typeof o.description === "string" && o.description.length >= 4 && o.description.length <= 80 ? o.description : l.description;
          yield { type: "line", line: { ...l, description: d } };
        } else if (o.type === "line" && !sheet && freeCount < 20) {
          const ply = [3, 5, 7].includes(o.ply as number) ? (o.ply as number) : null;
          const cat = CATS.includes(o.category as string) ? (o.category as string) : null;
          const L = int(o.length_mm, 50, 3000), W = int(o.width_mm, 50, 3000), H = int(o.height_mm, 0, 2000);
          const q1 = int(o.qty_p1, 0, 5_000_000), q2 = int(o.qty_p2, 0, 5_000_000);
          if (!ply || !cat || L === null || W === null || H === null || q1 === null || q2 === null || typeof o.description !== "string") return;
          freeCount += 1;
          const gsm = int(o.gsm, 80, 250) ?? 140;
          const line: SheetLine = {
            line_no: freeCount, item_code: `${ctx.codePrefix}-${String(freeCount).padStart(2, "0")}`, description: o.description.slice(0, 80),
            category: cat, ply, gsm, bf: int(o.bf, 10, 35) ?? 20, flute: typeof o.flute === "string" ? o.flute.slice(0, 4) : "BC",
            length_mm: L, width_mm: W, height_mm: H, qty_p1: q1, qty_p2: q2, is_new: true, spec_key: `${cat}|${ply}|${gsm}|${L}x${W}x${H}`,
          };
          yield { type: "line", line };
          if (typeof o.assumed === "string" && o.assumed.trim()) {
            yield { type: "note", note: { kind: "gap", text: `Line ${freeCount} (${line.description}): assumed ${o.assumed.trim()}. Please confirm before sending.` } };
          }
        } else if (o.type === "note" && typeof o.text === "string") {
          yield { type: "note", note: { kind: o.kind === "gap" ? "gap" : "info", text: o.text } };
        } else if (o.type === "terms") {
          terms = { type: "terms", payment_days: int(o.payment_days, 15, 120) ?? 60, validity_days: int(o.validity_days, 30, 180) ?? 90, due_day: int(o.due_day, 3, 21) ?? 7 };
          yield terms;
        } else if (o.type === "cover_email" && typeof o.text === "string") {
          cover = o.text;
          yield { type: "cover_email", text: o.text };
        }
      };
      for await (const ev of stream) {
        if (ev.type === "response.output_text.delta") {
          buf += ev.delta;
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            yield* handle(buf.slice(0, nl));
            buf = buf.slice(nl + 1);
          }
        }
      }
      yield* handle(buf);
    } catch {
      source = "prepared";
      if (sheet) yield { type: "status", text: "Co-pilot unavailable, using the prepared draft from the volume sheet." };
    }
  } else {
    source = "prepared";
  }

  if (!sheet) {
    if (!freeCount) {
      yield { type: "error", text: "The co-pilot couldn't draft lines from this request. Add sizes and yearly quantities to the request, or try again." };
      return;
    }
  } else {
    if (emitted.size === 0) source = "prepared";
    for (const l of sheet) {
      if (emitted.has(l.item_code)) continue;
      emitted.add(l.item_code);
      if (source === "prepared") await new Promise((r) => setTimeout(r, 25));
      yield { type: "line", line: l };
    }
    const fresh = sheet.filter((l) => l.is_new).map((l) => l.item_code);
    if (fresh.length) yield { type: "note", note: { kind: "info", text: `${fresh.join(" and ")} ${fresh.length > 1 ? "are" : "is"} new this year, so last year's contracts can't price ${fresh.length > 1 ? "them" : "it"}.` } };
  }
  if (!terms) yield { type: "terms", payment_days: 60, validity_days: 90, due_day: 7 };
  if (!cover) yield { type: "cover_email", text: preparedCoverEmail(ctx.company, 7) };
  yield { type: "done", source };
}

export const QUESTIONS = STANDARD_QUESTIONS;
