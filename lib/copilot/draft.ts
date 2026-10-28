// The RFQ co-pilot (FR-1.3): drafts the RFQ from the internal request, the volume sheet and the RFP context.
// The AI writes descriptions, gap notes, terms and the cover email; code keeps every number from the sheet.
import { aiConfigured, aiModel, openai } from "@/lib/ai/client";
import { STANDARD_QUESTIONS, VOLUME_SHEET } from "@/lib/demo/script";
import type { CopilotNote, InternalRequest, VendorRecord } from "@/lib/types";

export type SheetLine = (typeof VOLUME_SHEET)[number];

export type DraftEvent =
  | { type: "status"; text: string }
  | { type: "line"; line: SheetLine & { description: string } }
  | { type: "note"; note: CopilotNote }
  | { type: "terms"; payment_days: number; validity_days: number; due_day: number }
  | { type: "cover_email"; text: string }
  | { type: "done"; source: "ai" | "prepared" }
  | { type: "error"; text: string };

const INSTRUCTIONS = `You are a procurement co-pilot drafting an RFQ for corrugated packaging.
Output ONLY newline-delimited JSON objects, one per line, no prose, no code fences, in this order:
1. For EVERY item in the volume sheet, in sheet order: {"type":"line","item_code":"PM-01","description":"<clear buyer-facing description, max 60 chars, keep size and pack info>"}
2. 2–4 notes about gaps or risks a buyer should know before sending: {"type":"note","kind":"gap"|"info","text":"<one sentence>"}
3. {"type":"terms","payment_days":<int>,"validity_days":<int>,"due_day":<int days after sending>}
4. {"type":"cover_email","text":"<short email to suppliers inviting a quote; ask them to quote per piece, ex-GST, delivered to both plants, and answer the questionnaire; say any format is fine>"}
Never change quantities, sizes, ply or GSM: those come from the sheet.`;

export function preparedCoverEmail(company: string, dueDay: number) {
  return `Dear Supplier,

${company} invites you to quote for the 30 corrugated packaging items in the attached RFQ, for supply to Plant 1 (Pune) and Plant 2 (Nashik).

Please quote per piece, excluding GST, delivered to both plants, and answer the 12-question supplier questionnaire. The attached Excel template is the easiest way to reply, but any format is fine.

Payment terms: 60 days. Please reply within ${dueDay} days.

Regards,
Pavan
Procurement, ${company}`;
}

function sheetNotes(): CopilotNote[] {
  const fresh = VOLUME_SHEET.filter((l) => l.is_new).map((l) => l.item_code);
  return [{ kind: "info", text: `${fresh.join(" and ")} are new this year, so last year's contracts can't price them.` }];
}

/** Streams draft events. Falls back to a labelled prepared draft if the AI is unavailable (J5). */
export async function* draftRfq(ctx: { request: InternalRequest; company: string; vendors: VendorRecord[] }): AsyncGenerator<DraftEvent> {
  const emitted = new Set<string>();
  const byCode = new Map(VOLUME_SHEET.map((l) => [l.item_code, l]));
  let terms: DraftEvent | null = null;
  let cover: string | null = null;
  let source: "ai" | "prepared" = "ai";

  if (aiConfigured()) {
    yield { type: "status", text: "Reading the internal request, the volume sheet and 5 RFP summaries…" };
    try {
      const sheet = VOLUME_SHEET.map((l) =>
        `${l.item_code} | ${l.description} | ${l.ply}-ply ${l.gsm} GSM BF${l.bf} ${l.flute} | ${l.length_mm}×${l.width_mm}${l.height_mm ? `×${l.height_mm}` : ""} mm | P1 ${l.qty_p1} | P2 ${l.qty_p2}${l.is_new ? " | NEW" : ""}`,
      ).join("\n");
      const rfp = ctx.vendors.map((v) => `${v.code} ${v.name}: ${v.rfp_summary}`).join("\n");
      const stream = await openai().responses.create({
        model: aiModel(),
        reasoning: { effort: "low" },
        instructions: INSTRUCTIONS,
        input: `Internal request from ${ctx.request.from}:\nSubject: ${ctx.request.subject}\n${ctx.request.body}\n\nVolume sheet:\n${sheet}\n\nRFP summaries:\n${rfp}\n\nStandard questionnaire (12 questions) is attached separately.`,
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
        if (o.type === "line" && typeof o.item_code === "string") {
          const l = byCode.get(o.item_code);
          if (!l || emitted.has(l.item_code)) return;
          emitted.add(l.item_code);
          const d = typeof o.description === "string" && o.description.length >= 4 && o.description.length <= 80 ? o.description : l.description;
          yield { type: "line", line: { ...l, description: d } };
        } else if (o.type === "note" && typeof o.text === "string") {
          yield { type: "note", note: { kind: o.kind === "gap" ? "gap" : "info", text: o.text } };
        } else if (o.type === "terms") {
          const n = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && v >= lo && v <= hi ? Math.round(v) : d);
          terms = { type: "terms", payment_days: n(o.payment_days, 15, 120, 60), validity_days: n(o.validity_days, 30, 180, 90), due_day: n(o.due_day, 3, 21, 7) };
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
      yield { type: "status", text: "Co-pilot unavailable, using the prepared draft." };
    }
  } else {
    source = "prepared";
  }

  // Anything the AI didn't produce comes from the sheet, so the draft is always complete.
  if (emitted.size < VOLUME_SHEET.length && source === "ai" && emitted.size === 0) source = "prepared";
  for (const l of VOLUME_SHEET) {
    if (emitted.has(l.item_code)) continue;
    emitted.add(l.item_code);
    if (source === "prepared") await new Promise((r) => setTimeout(r, 25));
    yield { type: "line", line: l };
  }
  for (const note of sheetNotes()) yield { type: "note", note };
  if (!terms) yield { type: "terms", payment_days: 60, validity_days: 90, due_day: 7 };
  if (!cover) yield { type: "cover_email", text: preparedCoverEmail(ctx.company, 7) };
  yield { type: "done", source };
}

export const QUESTIONS = STANDARD_QUESTIONS;
