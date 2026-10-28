import { createClient } from "@/lib/supabase/server";
import { draftRfq, QUESTIONS, type DraftEvent } from "@/lib/copilot/draft";
import type { CopilotNote, Rfx, VendorRecord } from "@/lib/types";

export const maxDuration = 300;

/** Streams the co-pilot's RFQ draft as newline-delimited JSON, then saves it. */
export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Not signed in", { status: 401 });
  const { data: rfx } = await supabase.from("rfx").select("*").single<Rfx>();
  if (!rfx) return new Response("No RFx", { status: 404 });
  if (rfx.rules_locked_at) return new Response("The RFQ is already locked and sent.", { status: 409 });
  const { data: vendors } = await supabase.from("vendors").select("*").eq("rfx_id", rfx.id).order("code");

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (e: DraftEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      const lines: Extract<DraftEvent, { type: "line" }>["line"][] = [];
      const notes: CopilotNote[] = [];
      let terms = { payment_days: 60, validity_days: 90, due_day: 7 };
      let cover = "";
      let source: "ai" | "prepared" = "prepared";
      try {
        for await (const e of draftRfq({ request: rfx.internal_request, company: rfx.buyer_company, vendors: (vendors ?? []) as VendorRecord[] })) {
          if (e.type === "line") lines.push(e.line);
          if (e.type === "note") notes.push(e.note);
          if (e.type === "terms") terms = e;
          if (e.type === "cover_email") cover = e.text;
          if (e.type === "done") {
            source = e.source;
            break;
          }
          send(e);
        }

        // Save: lines, questionnaire, terms. Re-drafting replaces the previous draft.
        await supabase.from("line_items").delete().eq("rfx_id", rfx.id);
        await supabase.from("questions").delete().eq("rfx_id", rfx.id);
        const ins1 = await supabase.from("line_items").insert(
          lines.map((l) => ({
            rfx_id: rfx.id, line_no: l.line_no, item_code: l.item_code, description: l.description, category: l.category,
            ply: l.ply, gsm: l.gsm, bf: l.bf, flute: l.flute, length_mm: l.length_mm, width_mm: l.width_mm,
            height_mm: l.height_mm, qty_p1: l.qty_p1, qty_p2: l.qty_p2, spec_key: l.spec_key, is_new: l.is_new,
          })),
        );
        const ins2 = await supabase.from("questions").insert(QUESTIONS.map((q) => ({ rfx_id: rfx.id, ...q })));
        const upd = await supabase.from("rfx").update({
          drafted_at: new Date().toISOString(), draft_source: source, cover_email: cover,
          payment_days: terms.payment_days, validity_days: terms.validity_days, due_day: terms.due_day,
          copilot_notes: notes, tour_step: Math.max(rfx.tour_step, 2),
        }).eq("id", rfx.id);
        const err = ins1.error ?? ins2.error ?? upd.error;
        if (err) throw new Error(err.message);
        send({ type: "done", source });
      } catch (e) {
        send({ type: "error", text: e instanceof Error ? e.message : "Drafting failed" });
      }
      controller.close();
    },
  });
  return new Response(body, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
