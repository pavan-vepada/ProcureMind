// The reply pipeline (architecture A2): store → prepare → AI extract → validate → resolve gaps → save.
// Each step writes a plain-language progress line that the Replies tab polls (FR-3.2).
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiConfigured } from "@/lib/ai/client";
import { idealReading } from "@/lib/demo/datasets";
import { DEFAULT_FREIGHT_ESTIMATE, type Line } from "@/lib/engine/types";
import { extractReply } from "@/lib/extract/extract";
import { prepare, type FileKind, type Prepared } from "@/lib/extract/prepare";
import { issuesClosedBy, resolveExtraction, type ContractInfo, type Resolved } from "@/lib/extract/resolve";
import { asExtraction, type Extraction } from "@/lib/extract/schema";
import type { Attachment, Message, Rfx, Run, VendorRecord } from "@/lib/types";

const KIND_LABEL: Record<FileKind, string> = {
  excel: "Excel sheet", pdf: "PDF", word: "Word document", photo: "photo", certificate: "certificate", text: "email",
};

export async function loadAttachmentBytes(supabase: SupabaseClient, a: Attachment): Promise<Buffer> {
  if (a.storage === "seed") return readFile(path.join(process.cwd(), "seed", "files", path.basename(a.path)));
  const { data, error } = await supabase.storage.from("uploads").download(a.path);
  if (error || !data) throw new Error(`Couldn't open ${a.filename}: ${error?.message ?? "not found"}`);
  return Buffer.from(await data.arrayBuffer());
}

function plainError(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  if (/OPENAI_API_KEY/.test(m)) return "The AI service isn't configured (no OpenAI key).";
  if (/password|encrypted/i.test(m)) return "The file is password-protected. Ask the vendor for an unlocked copy.";
  if (/Invalid PDF|corrupt|zip|End of data|Can't find end of central directory/i.test(m)) return "The file looks damaged or isn't a real quote file.";
  if (/timeout|timed out|ETIMEDOUT|aborted/i.test(m)) return "The AI took too long to answer. Try again.";
  if (/429|rate limit/i.test(m)) return "The AI service is busy right now. Try again in a minute.";
  return m.length > 180 ? `${m.slice(0, 177)}…` : m;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function contractInfo(rows: { vendor_code: string; contract_no: string; contract_lines: unknown }[]): ContractInfo[] {
  return rows.map((c) => ({
    vendor_code: c.vendor_code,
    contract_no: c.contract_no,
    lines: (c.contract_lines as ContractInfo["lines"]).map((l) => ({ ...l, price: Number(l.price) })),
  }));
}

export type SaveContext = {
  supabase: SupabaseClient;
  rfx: Rfx;
  vendor: VendorRecord;
  lines: Line[];
  contracts: ContractInfo[];
  message: Message;
  attachments: Attachment[];
  extraction: Extraction;
  kind: "reply" | "clarification";
};

/** Steps 5–7: resolve gaps (contract memory, flags) and save. Revisions never overwrite: old values are marked replaced. */
export async function resolveAndSave(c: SaveContext): Promise<{ resolved: Resolved; closed: string[]; fresh: number }> {
  const { supabase, rfx, vendor, lines, message } = c;
  const requested = rfx.payment_days ?? 60;
  const resolved = resolveExtraction(c.extraction, {
    vendorCode: vendor.code, lines, contracts: c.contracts, requestedPaymentDays: requested,
    today: new Date().toISOString().slice(0, 10), kind: c.kind,
  });
  const lineId = new Map(lines.map((l) => [l.line_no, l.id]));
  const lineNoById = new Map(lines.map((l) => [l.id, l.line_no]));
  const attachmentByName = new Map(c.attachments.map((a) => [a.filename, a.id]));
  const withIds = <T extends { attachment: string | null } | null>(s: T) =>
    s ? { ...s, attachment_id: s.attachment ? attachmentByName.get(s.attachment) ?? null : null, message_id: message.id } : null;
  const now = new Date().toISOString();

  const newLineIds = resolved.quotes.map((q) => lineId.get(q.line_no)!);
  if (newLineIds.length) {
    const old = await supabase.from("quote_values").update({ is_current: false, replaced_at: now })
      .eq("vendor_id", vendor.id).eq("is_current", true).in("line_item_id", newLineIds);
    if (old.error) throw new Error(`Saving prices failed: ${old.error.message}`);
    const { error } = await supabase.from("quote_values").insert(
      resolved.quotes.map((q) => ({
        rfx_id: rfx.id, vendor_id: vendor.id, line_item_id: lineId.get(q.line_no)!, message_id: message.id,
        raw: q.raw, confidence: q.confidence, provenance: q.provenance, contract_ref: q.contract_ref, source: withIds(q.source),
      })),
    );
    if (error) throw new Error(`Saving prices failed: ${error.message}`);
  }

  const { data: open } = await supabase.from("issues").select("id, kind, title, line_item_id, status").eq("vendor_id", vendor.id).neq("status", "resolved");
  const openWithLine = (open ?? []).map((i) => ({ ...i, line_no: i.line_item_id ? lineNoById.get(i.line_item_id) ?? null : null }));
  const closed = issuesClosedBy(resolved, openWithLine, requested);
  if (closed.length) {
    await supabase.from("issues").update({
      status: "resolved", resolved_at: now,
      resolution: c.kind === "clarification" ? `Updated from clarification, ${fmtDate(message.received_at)}` : "Resolved by a newer reply",
    }).in("id", closed);
  }
  const stillOpen = openWithLine.filter((i) => !closed.includes(i.id));
  const fresh = resolved.issues.filter((i) => !stillOpen.some((o) => o.kind === i.kind && o.line_no === i.line_no && o.title === i.title));
  if (fresh.length) {
    const { error } = await supabase.from("issues").insert(
      fresh.map((i) => ({
        rfx_id: rfx.id, vendor_id: vendor.id, line_item_id: i.line_no ? lineId.get(i.line_no) ?? null : null,
        kind: i.kind, title: i.title, detail: i.detail, confidence: i.confidence, askable: i.askable, source: withIds(i.source),
      })),
    );
    if (error) throw new Error(`Saving flags failed: ${error.message}`);
  }

  const check = (res: { error: { message: string } | null }, what: string) => {
    if (res.error) throw new Error(`Saving ${what} failed: ${res.error.message}`);
  };
  if (resolved.answers.length) {
    check(await supabase.from("answers").upsert(
      resolved.answers.map((a) => ({ rfx_id: rfx.id, vendor_id: vendor.id, q_no: a.q_no, met: a.met, answer: a.answer })),
      { onConflict: "vendor_id,q_no" },
    ), "questionnaire answers");
  }
  for (const cert of resolved.certificates) {
    check(await supabase.from("certificates").delete().eq("vendor_id", vendor.id).eq("name", cert.name), "certificates");
    check(await supabase.from("certificates").insert({ rfx_id: rfx.id, vendor_id: vendor.id, name: cert.name, valid_until: cert.valid_until, source: withIds(cert.source) }), "certificates");
  }

  const t = resolved.terms;
  const vendorUpdate: Record<string, unknown> = { status: "replied" };
  for (const k of ["payment_days", "validity_days", "lead_time_days", "freight"] as const) if (t[k] !== null) vendorUpdate[k] = t[k];
  if (t.discount) vendorUpdate.discount = t.discount;
  check(await supabase.from("vendors").update(vendorUpdate).eq("id", vendor.id), "vendor terms");

  // One key at a time, atomically: replies run in parallel.
  const freightTerm = t.freight ?? vendor.freight;
  if (resolved.freight) {
    check(await supabase.rpc("merge_assumption", { p_rfx: rfx.id, p_section: "freight", p_key: vendor.code, p_value: resolved.freight }), "freight");
  } else if (freightTerm === "extra" || freightTerm === "unclear") {
    check(await supabase.rpc("merge_assumption", {
      p_rfx: rfx.id, p_section: "freight", p_key: vendor.code, p_value: { per_piece: DEFAULT_FREIGHT_ESTIMATE, source: "estimate" }, p_only_if_missing: true,
    }), "freight");
  }
  return { resolved, closed, fresh: fresh.length };
}

export function doneText(kind: "reply" | "clarification", r: Resolved, total: number, closed: number) {
  return kind === "reply"
    ? `Done · ${r.linesFound} of ${total} lines found${r.quotes.length > r.linesFound ? ` · ${r.quotes.length - r.linesFound} from contract` : ""}`
    : `Done · ${r.quotes.length} value${r.quotes.length === 1 ? "" : "s"} updated${closed ? ` · ${closed} issue${closed === 1 ? "" : "s"} resolved` : ""}`;
}

export async function processRun(supabase: SupabaseClient, runId: string, opts: { savedRun?: boolean } = {}) {
  const started = Date.now();
  const { data: run } = await supabase.from("processing_runs").select("*").eq("id", runId).single<Run>();
  if (!run) throw new Error("Run not found");
  if (run.status === "done") return run;
  if (run.status === "running" && run.started_at && Date.now() - Date.parse(run.started_at) < 280_000) return run;

  const step = async (s: string, progress: number, extra: Record<string, unknown> = {}) => {
    await supabase.from("processing_runs").update({ step: s, progress, ...extra }).eq("id", runId);
  };

  try {
    await step("Reading the reply…", 8, { status: "running", started_at: new Date().toISOString(), error: null, finished_at: null });

    const [{ data: message }, { data: attachments }, { data: rfx }] = await Promise.all([
      supabase.from("messages").select("*").eq("id", run.message_id).single<Message>(),
      supabase.from("attachments").select("*").eq("message_id", run.message_id),
      supabase.from("rfx").select("*").eq("id", run.rfx_id).single<Rfx>(),
    ]);
    if (!message || !rfx) throw new Error("Reply not found");
    const vendorId = run.vendor_id ?? message.vendor_id;
    if (!vendorId) throw new Error("Pick which vendor this reply is from first.");
    const [{ data: vendor }, { data: lines }, { data: questions }, { data: contracts }, { count: priorQuotes }] = await Promise.all([
      supabase.from("vendors").select("*").eq("id", vendorId).single<VendorRecord>(),
      supabase.from("line_items").select("*").eq("rfx_id", rfx.id).order("line_no"),
      supabase.from("questions").select("q_no, text").eq("rfx_id", rfx.id).order("q_no"),
      supabase.from("contracts").select("vendor_code, contract_no, contract_lines(line_no, spec_key, price, unit)").eq("rfx_id", rfx.id),
      supabase.from("quote_values").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId).eq("is_current", true),
    ]);
    if (!vendor || !lines?.length) throw new Error("The RFQ has no lines yet.");

    // A clarification, or any later reply from a vendor we already have prices for, is a revision (FR-3.9).
    const kind: "reply" | "clarification" = message.kind === "clarification_reply" || (priorQuotes ?? 0) > 0 ? "clarification" : "reply";

    // Step 2: prepare by format.
    const files = (attachments ?? []) as Attachment[];
    const parts: Prepared[] = [];
    if (message.body.trim()) parts.push(await prepare(null, "text", message.body));
    for (const a of files) {
      await step(`Reading the ${KIND_LABEL[a.kind]}…`, 18);
      parts.push(await prepare(a.filename, a.kind, await loadAttachmentBytes(supabase, a), a.mime));
    }

    // Step 3: the AI reads it (or the presenter's recorded reading of a sample reply).
    let extraction: Extraction;
    let model = "saved run";
    const saved = opts.savedRun && message.kind !== "upload" ? idealReading(rfx.dataset ?? "", vendor.code, kind) : null;
    const mainKind = files.find((a) => a.kind !== "certificate")?.kind ?? "text";
    await step(`AI is reading the ${KIND_LABEL[mainKind]} and finding prices…`, 35);
    if (saved) {
      extraction = asExtraction(saved);
      await new Promise((r) => setTimeout(r, 1200));
    } else {
      if (!aiConfigured()) throw new Error("OPENAI_API_KEY is missing");
      const r = await extractReply(
        { vendorName: vendor.name, vendorCode: vendor.code, lines: lines as Line[], questions: questions ?? [], paymentDays: rfx.payment_days ?? 60 },
        parts,
      );
      extraction = r.extraction;
      model = r.model;
    }

    await step("Matching lines and checking every number against the source…", 72);
    const { resolved, closed, fresh } = await resolveAndSave({
      supabase, rfx, vendor, lines: lines as Line[], contracts: contractInfo(contracts ?? []), message, attachments: files, extraction, kind,
    });
    await supabase.from("rfx").update({ updated_at: new Date().toISOString() }).eq("id", rfx.id);
    await step(doneText(kind, resolved, lines.length, closed.length), 100, {
      status: "done", finished_at: new Date().toISOString(), lines_found: resolved.linesFound,
      summary: { saved_run: !!saved, model, seconds: Math.round((Date.now() - started) / 1000), issues: fresh, kind },
    });
  } catch (err) {
    await step(plainError(err), 100, { status: "failed", error: plainError(err), finished_at: new Date().toISOString() });
  }
  const { data } = await supabase.from("processing_runs").select("*").eq("id", runId).single<Run>();
  return data;
}
