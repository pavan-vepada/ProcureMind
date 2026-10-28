"use server";

import { randomUUID } from "node:crypto";
import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/data";
import { dataset, FX_RATE, SUPPLIER_DIRECTORY } from "@/lib/demo/datasets";
import { runScenario, ScenarioSpec } from "@/lib/engine/scenario";
import { withDefaults, type Assumptions } from "@/lib/engine/types";
import { kindOf } from "@/lib/extract/prepare";
import type { StageKey } from "@/lib/lifecycle";
import { buildMemo } from "@/lib/memo";
import type { Rfx, VendorRecord } from "@/lib/types";
import { loadAnalysis } from "@/lib/workspace/analysis";
import { createFromDataset, insertReply, RULES, seedWorkspace } from "@/lib/workspace/seed";

const MAX_UPLOAD = 10 * 1024 * 1024;
const MAX_UPLOADS_PER_ACCOUNT = 30;
const BUYER_EMAIL = "pavan@sunrise-consumer.example";
const ORDER: StageKey[] = ["need", "rfi", "rfp", "rfq", "replies", "analysis", "award", "po"];

async function current(rfxId: string) {
  const { supabase, user } = await requireUser();
  const { data: rfx } = await supabase.from("rfx").select("*").eq("id", rfxId).single<Rfx>();
  if (!rfx) throw new Error("RFx not found");
  return { supabase, user, rfx };
}

async function log(rfxId: string, label: string, entity: string, entityId: string | null, undo: unknown) {
  const { supabase } = await requireUser();
  await supabase.from("change_log").insert({ rfx_id: rfxId, label, entity, entity_id: entityId, undo });
}

async function touch(rfxId: string, extra: Record<string, unknown> = {}) {
  const { supabase } = await requireUser();
  await supabase.from("rfx").update({ updated_at: new Date().toISOString(), ...extra }).eq("id", rfxId);
}

// ---------------- Workspace ----------------

/** Puts the sample RFx back the way a new buyer sees them. The buyer's own new RFx are removed too. */
export async function restoreSampleWorkspace() {
  const { supabase, user } = await requireUser();
  const { data: files } = await supabase.storage.from("uploads").list(user.id, { limit: 1000 });
  if (files?.length) await supabase.storage.from("uploads").remove(files.map((f) => `${user.id}/${f.name}`));
  await supabase.from("rfx").delete().eq("owner_id", user.id);
  await supabase.from("workspace_seeds").delete().eq("owner_id", user.id);
  await seedWorkspace(supabase);
  revalidatePath("/rfx", "layout");
  redirect("/rfx");
}

async function nextCode(): Promise<string> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("rfx").select("code");
  const max = Math.max(21, ...(data ?? []).map((r) => Number(r.code.split("-").at(-1)) || 0));
  return `RFX-2026-${String(max + 1).padStart(3, "0")}`;
}

/** New RFx from an internal request waiting in the queue: vendors shortlisted, volume sheet attached. */
export async function startFromRequest(datasetKey: string) {
  await requireUser();
  const ds = dataset(datasetKey);
  if (!ds) throw new Error("Request not found");
  const { supabase } = await requireUser();
  const id = await createFromDataset(
    supabase, ds,
    { stage: "rfq", createdDaysAgo: 0, sentDaysAgo: null, drafted: false, read: [], arrived: [], scenarios: [], memo: false, touchedHoursAgo: 0 },
  );
  redirect(`/rfx/${id}/rfq`);
}

const NewNeed = z.object({
  title: z.string().trim().min(4, "Give the RFx a short title.").max(90),
  request: z.string().trim().min(20, "Describe what you need in a sentence or two, with sizes and yearly volumes if you know them.").max(4000),
  suppliers: z.array(z.string()).min(2, "Pick at least two suppliers to invite.").max(8),
});

/** New RFx from a need the buyer describes; the co-pilot drafts the lines on the next screen. */
export async function startFromNeed(input: z.infer<typeof NewNeed>) {
  const parsed = NewNeed.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase } = await requireUser();
  const id = randomUUID();
  const now = new Date().toISOString();
  const { error } = await supabase.from("rfx").insert({
    id, code: await nextCode(), title: parsed.data.title, buyer_company: "Sunrise Consumer Goods", category: "Corrugated packaging",
    dataset: null, stage: "rfq", tour_step: 10, tour_hidden: true, created_at: now, updated_at: now,
    internal_request: { from: "You", day: 0, subject: parsed.data.title, body: parsed.data.request },
    assumptions: { fx_rate: FX_RATE, freight: {}, discount_mode: {}, weight_overrides: {} },
  });
  if (error) return { error: error.message };
  const chosen = SUPPLIER_DIRECTORY.filter((s) => parsed.data.suppliers.includes(s.email));
  await supabase.from("vendors").insert(chosen.map((s, i) => ({
    rfx_id: id, code: `V${i + 1}`, name: s.name, email: s.email, reply_format: "email", rfi_note: s.note, rfp_summary: s.note,
  })));
  redirect(`/rfx/${id}/rfq`);
}

export async function deleteRfx(rfxId: string) {
  const { supabase } = await current(rfxId);
  await supabase.from("rfx").delete().eq("id", rfxId);
  revalidatePath("/rfx", "layout");
  redirect("/rfx");
}

/** Moves the lifecycle forward (never backwards). */
export async function markStage(rfxId: string, stage: StageKey) {
  const { rfx } = await current(rfxId);
  if (ORDER.indexOf(stage) > ORDER.indexOf(rfx.stage)) {
    await touch(rfxId, { stage });
    refresh();
  }
}

// ---------------- RFQ ----------------

export async function updateLineQty(rfxId: string, lineId: string, field: "qty_p1" | "qty_p2", value: number) {
  if (!["qty_p1", "qty_p2"].includes(field) || !Number.isInteger(value) || value < 0 || value > 10_000_000) return { error: "Enter a whole number of pieces." };
  const { supabase, rfx } = await current(rfxId);
  if (rfx.rules_locked_at) return { error: "The RFQ is locked and sent." };
  const { data: line } = await supabase.from("line_items").select("*").eq("id", lineId).eq("rfx_id", rfxId).single();
  if (!line) return { error: "Line not found" };
  await supabase.from("line_items").update({ [field]: value }).eq("id", lineId);
  await log(rfxId, `Changed ${line.item_code} ${field === "qty_p1" ? "Plant 1" : "Plant 2"} quantity ${line[field].toLocaleString("en-IN")} → ${value.toLocaleString("en-IN")}`, "line_items", lineId, { op: "line", id: lineId, field, value: line[field] });
  refresh();
  return { error: null };
}

const LockRules = z.object({ required_q: z.array(z.number().int()), min_score: z.number().int().min(0).max(100) });

/** FR-1.7 + FR-2.1: freeze the evaluation rules, then send the RFQ to the vendors. */
export async function lockAndSend(rfxId: string, rules: z.infer<typeof LockRules>) {
  const r = LockRules.parse(rules);
  const { supabase, rfx } = await current(rfxId);
  if (rfx.rules_locked_at) redirect(`/rfx/${rfxId}/replies`);
  if (!rfx.drafted_at) throw new Error("Draft the RFQ first.");
  const { data: vendors } = await supabase.from("vendors").select("*").eq("rfx_id", rfxId).order("code");
  const now = new Date().toISOString();
  await supabase.from("rfx").update({
    rules: { ...RULES(now.slice(0, 10)), ...r }, rules_locked_at: now, sent_at: now, stage: "replies", updated_at: now,
  }).eq("id", rfxId);
  const due = new Date(Date.now() + rfx.due_day * 864e5).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  await supabase.from("messages").insert(
    (vendors ?? []).map((v) => ({
      rfx_id: rfxId, vendor_id: v.id, direction: "out", kind: "rfq", from_addr: BUYER_EMAIL, to_addr: v.email,
      subject: `${rfx.code} · ${rfx.title}, quote by ${due}`, body: (rfx.cover_email ?? "").replace(/^Dear Supplier,/, `Dear ${v.name},`), day: 0, received_at: now,
    })),
  );
  await supabase.from("vendors").update({ status: "sent" }).eq("rfx_id", rfxId);
  revalidatePath(`/rfx/${rfxId}`, "layout");
  redirect(`/rfx/${rfxId}/replies`);
}

// ---------------- Replies ----------------

/** Sample RFx only: brings in the replies from vendors who haven't answered yet. They are read live by the AI. */
export async function addSampleReplies(rfxId: string) {
  const { supabase, rfx } = await current(rfxId);
  const ds = dataset(rfx.dataset);
  if (!ds || !rfx.sent_at) return { error: "No sample replies for this RFx." };
  const [{ data: vendors }, { data: replies }] = await Promise.all([
    supabase.from("vendors").select("*").eq("rfx_id", rfxId),
    supabase.from("messages").select("vendor_id").eq("rfx_id", rfxId).eq("direction", "in"),
  ]);
  const answered = new Set((replies ?? []).map((m) => m.vendor_id));
  let n = 0;
  for (const v of (vendors ?? []) as VendorRecord[]) {
    if (answered.has(v.id)) continue;
    const reply = ds.replies.find((r) => r.vendor_code === v.code);
    if (!reply) continue;
    const { message } = await insertReply(supabase, rfx, v, reply, Date.now() - (ds.vendors.length - n) * 60_000, "reply");
    await supabase.from("processing_runs").insert({ rfx_id: rfxId, message_id: message.id, vendor_id: v.id });
    await supabase.from("vendors").update({ status: "replied" }).eq("id", v.id);
    n++;
  }
  await touch(rfxId);
  refresh();
  return { error: null, added: n };
}

/** FR-2.4: register a reply the browser uploaded to storage (or pasted text), and queue it for reading. */
export async function registerUpload(rfxId: string, input: { vendorCode: string; path?: string; filename?: string; mime?: string; size?: number; text?: string }) {
  const { supabase, user, rfx } = await current(rfxId);
  if (!rfx.drafted_at) return { error: "Draft the RFQ first, so there are lines to match the quote against." };
  const { data: vendor } = await supabase.from("vendors").select("id, email, name").eq("rfx_id", rfxId).eq("code", input.vendorCode).single();
  if (!vendor) return { error: "Pick which vendor this reply is from." };
  const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("kind", "upload");
  if ((count ?? 0) >= MAX_UPLOADS_PER_ACCOUNT) return { error: `You've reached the limit of ${MAX_UPLOADS_PER_ACCOUNT} uploads on this account.` };

  let body = "";
  let attachment: Record<string, unknown> | null = null;
  if (input.text?.trim()) {
    body = input.text.trim().slice(0, 20_000);
  } else if (input.path && input.filename && input.mime) {
    if (!input.path.startsWith(`${user.id}/`)) return { error: "Upload failed. Try again." };
    if ((input.size ?? 0) > MAX_UPLOAD) return { error: "That file is over 10 MB. Try a smaller file or a photo." };
    const kind = kindOf(input.filename, input.mime);
    if (!kind || kind === "text") return { error: "That file type isn't supported. Use Excel (.xlsx), PDF, Word (.docx), a photo (JPG/PNG) or paste the email text." };
    attachment = { filename: input.filename, kind, mime: input.mime, storage: "upload", path: input.path, size_bytes: input.size ?? null };
  } else {
    return { error: "Choose a file or paste the email text." };
  }

  const now = new Date().toISOString();
  const { data: m, error } = await supabase.from("messages").insert({
    rfx_id: rfxId, vendor_id: vendor.id, direction: "in", kind: "upload", from_addr: vendor.email, to_addr: BUYER_EMAIL,
    subject: attachment ? `Uploaded: ${input.filename}` : "Pasted email text", body, day: rfx.demo_day, received_at: now,
  }).select("id").single();
  if (error) return { error: error.message };
  if (attachment) await supabase.from("attachments").insert({ ...attachment, message_id: m.id });
  const { data: run } = await supabase.from("processing_runs").insert({ rfx_id: rfxId, message_id: m.id, vendor_id: vendor.id }).select("id").single();
  await supabase.from("vendors").update({ status: "replied" }).eq("id", vendor.id);
  await touch(rfxId, ORDER.indexOf(rfx.stage) < ORDER.indexOf("replies") ? { stage: "replies" } : {});
  return { error: null, runId: run!.id as string };
}

export async function newUploadPath(filename: string) {
  const { user } = await requireUser();
  const safe = filename.replace(/[^\w.\-]+/g, "_").slice(-80);
  return `${user.id}/${randomUUID()}-${safe}`;
}

// ---------------- Review, edits, assumptions, undo ----------------

export async function acceptIssue(rfxId: string, issueId: string) {
  const { supabase } = await current(rfxId);
  const { data: issue } = await supabase.from("issues").select("*").eq("id", issueId).eq("rfx_id", rfxId).single();
  if (!issue || issue.status === "resolved") return;
  await supabase.from("issues").update({ status: "resolved", resolution: "Accepted by buyer", resolved_at: new Date().toISOString() }).eq("id", issueId);
  if (issue.quote_value_id) await supabase.from("quote_values").update({ review: "accepted" }).eq("id", issue.quote_value_id);
  await log(rfxId, `Accepted: ${issue.title}`, "issues", issueId, { op: "issue", id: issueId, status: issue.status });
  await touch(rfxId);
  refresh();
}

/** FR-4.3: clears the easy ones at once; only real issues remain. */
export async function acceptAllHighConfidence(rfxId: string) {
  const { supabase } = await current(rfxId);
  const { data: issues } = await supabase.from("issues").select("id").eq("rfx_id", rfxId).eq("status", "open").eq("confidence", "high").eq("askable", false);
  if (!issues?.length) return;
  await supabase.from("issues").update({ status: "resolved", resolution: "Accepted (high confidence)", resolved_at: new Date().toISOString() }).in("id", issues.map((i) => i.id));
  await log(rfxId, `Accepted ${issues.length} high-confidence item${issues.length > 1 ? "s" : ""}`, "issues", null, { op: "issues", ids: issues.map((i) => i.id), status: "open" });
  await touch(rfxId);
  refresh();
}

/** Buyer enters a value (₹ per piece, pre-GST, delivered). Old value kept in history; undoable. */
export async function editQuote(rfxId: string, vendorCode: string, lineId: string, pricePerPiece: number, reason: string) {
  if (!(pricePerPiece > 0) || pricePerPiece > 100_000) return { error: "Enter a price per piece in ₹." };
  const { supabase } = await current(rfxId);
  const { data: vendor } = await supabase.from("vendors").select("id, code").eq("rfx_id", rfxId).eq("code", vendorCode).single();
  const { data: line } = await supabase.from("line_items").select("id, line_no").eq("id", lineId).eq("rfx_id", rfxId).single();
  if (!vendor || !line) return { error: "Not found" };
  const { data: old } = await supabase.from("quote_values").select("id").eq("vendor_id", vendor.id).eq("line_item_id", lineId).eq("is_current", true).maybeSingle();
  if (old) await supabase.from("quote_values").update({ is_current: false, replaced_at: new Date().toISOString() }).eq("id", old.id);
  const { data: q } = await supabase.from("quote_values").insert({
    rfx_id: rfxId, vendor_id: vendor.id, line_item_id: lineId, provenance: "manual", confidence: "high", review: "edited",
    raw: { price: pricePerPiece, currency: "INR", unit: "piece", bundle_size: null, gst_included: false, tiers: [] },
    source: { attachment_id: null, attachment: null, kind: "text", ref: "Entered by buyer", snippet: reason || "Manual entry", page: null, cell: null, paragraph: null, bbox: null },
  }).select("id").single();
  await supabase.from("issues").update({ status: "resolved", resolution: "Value entered by buyer", resolved_at: new Date().toISOString() })
    .eq("vendor_id", vendor.id).eq("line_item_id", lineId).neq("status", "resolved");
  await log(rfxId, `Set ${vendor.code} line ${line.line_no} to ₹${pricePerPiece.toFixed(2)} per piece`, "quote_values", q!.id, { op: "quote", newId: q!.id, oldId: old?.id ?? null });
  await touch(rfxId);
  refresh();
  return { error: null };
}

export async function setAssumptions(rfxId: string, patch: Partial<Assumptions>, label: string) {
  const { supabase, rfx } = await current(rfxId);
  const before = withDefaults(rfx.assumptions, FX_RATE);
  const after: Assumptions = {
    fx_rate: patch.fx_rate ?? before.fx_rate,
    freight: { ...before.freight, ...patch.freight },
    discount_mode: { ...before.discount_mode, ...patch.discount_mode },
    weight_overrides: { ...before.weight_overrides, ...patch.weight_overrides },
  };
  await supabase.from("rfx").update({ assumptions: after, updated_at: new Date().toISOString() }).eq("id", rfxId);
  await log(rfxId, label, "rfx", rfxId, { op: "assumptions", value: before });
  refresh();
}

/** FR-4.13: undo any logged change. */
export async function undoChange(rfxId: string, changeId: string) {
  const { supabase } = await current(rfxId);
  const { data: c } = await supabase.from("change_log").select("*").eq("id", changeId).eq("rfx_id", rfxId).single();
  if (!c || c.undone) return;
  const u = c.undo as Record<string, unknown> & { op: string };
  if (u.op === "line") await supabase.from("line_items").update({ [u.field as string]: u.value }).eq("id", u.id);
  if (u.op === "issue") await supabase.from("issues").update({ status: u.status, resolution: null, resolved_at: null }).eq("id", u.id);
  if (u.op === "issues") await supabase.from("issues").update({ status: u.status, resolution: null, resolved_at: null }).in("id", u.ids as string[]);
  if (u.op === "assumptions") await supabase.from("rfx").update({ assumptions: u.value }).eq("id", rfxId);
  if (u.op === "quote") {
    await supabase.from("quote_values").update({ is_current: false }).eq("id", u.newId);
    if (u.oldId) await supabase.from("quote_values").update({ is_current: true, replaced_at: null }).eq("id", u.oldId);
  }
  await supabase.from("change_log").update({ undone: true }).eq("id", changeId);
  refresh();
}

// ---------------- Clarification (Improvement A) ----------------

/** FR-4.7: send one consolidated email. Sample vendors with a scripted answer reply straight away (FR-4.8). */
export async function sendClarification(rfxId: string, vendorCode: string, subject: string, body: string, issueIds: string[]) {
  const { supabase, rfx } = await current(rfxId);
  const { data: vendor } = await supabase.from("vendors").select("*").eq("rfx_id", rfxId).eq("code", vendorCode).single<VendorRecord>();
  if (!vendor) return { error: "Vendor not found" };
  const now = Date.now();
  await supabase.from("messages").insert({
    rfx_id: rfxId, vendor_id: vendor.id, direction: "out", kind: "clarification_request", from_addr: BUYER_EMAIL,
    to_addr: vendor.email, subject, body, day: rfx.demo_day, received_at: new Date(now).toISOString(),
  });
  if (issueIds.length) await supabase.from("issues").update({ status: "asked" }).in("id", issueIds).eq("status", "open");
  await supabase.from("vendors").update({ status: "clarification_requested" }).eq("id", vendor.id);

  const scripted = dataset(rfx.dataset)?.clarifications.find((r) => r.vendor_code === vendorCode);
  const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.id).eq("kind", "clarification_reply");
  let runId: string | null = null;
  if (scripted && !count) {
    const { message } = await insertReply(supabase, rfx, vendor, { vendor_code: vendorCode, day: 0, subject: scripted.subject, body: scripted.body, attachments: [] }, now + 5000, "clarification_reply");
    const { data: run } = await supabase.from("processing_runs").insert({ rfx_id: rfxId, message_id: message.id, vendor_id: vendor.id }).select("id").single();
    runId = run!.id;
  }
  // No revalidation here: the composer stays open to show the reply being read, then refreshes the page itself.
  await touch(rfxId);
  return { error: null, runId, replyExpected: Boolean(scripted) };
}

// ---------------- Scenarios and award ----------------

export async function saveScenario(rfxId: string, spec: ScenarioSpec, name: string) {
  const parsed = ScenarioSpec.parse(spec);
  const { supabase, rfx } = await current(rfxId);
  const a = await loadAnalysis(supabase, rfx);
  const result = runScenario(a.input, a.comparison, a.scenarioContracts, parsed);
  const { data } = await supabase.from("scenarios").insert({ rfx_id: rfxId, name: name.trim().slice(0, 80) || parsed.name, spec: parsed, result }).select("id").single();
  await touch(rfxId);
  refresh();
  return { id: data!.id as string };
}

export async function deleteScenario(rfxId: string, id: string) {
  const { supabase } = await current(rfxId);
  await supabase.from("scenarios").delete().eq("id", id).eq("rfx_id", rfxId);
  refresh();
}

/** FR-6.1/6.2: recompute the saved scenario with today's numbers and build the memo. */
export async function recommendAward(rfxId: string, scenarioId: string) {
  const { supabase, rfx } = await current(rfxId);
  const a = await loadAnalysis(supabase, rfx);
  const sc = a.scenarios.find((s) => s.id === scenarioId);
  if (!sc) throw new Error("Scenario not found");
  const result = runScenario(a.input, a.comparison, a.scenarioContracts, sc.spec);
  const content = await buildMemo(rfx, result, a.input, a.comparison, a.issues);
  await supabase.from("award_memos").delete().eq("rfx_id", rfxId);
  await supabase.from("award_memos").insert({ rfx_id: rfxId, scenario_id: sc.id, content });
  await touch(rfxId, { stage: "po" });
  revalidatePath(`/rfx/${rfxId}`, "layout");
  redirect(`/rfx/${rfxId}/award`);
}

export async function clearChat(rfxId: string) {
  const { supabase } = await current(rfxId);
  await supabase.from("chat_messages").delete().eq("rfx_id", rfxId);
  refresh();
}
