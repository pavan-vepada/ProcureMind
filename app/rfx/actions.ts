"use server";

import { randomUUID } from "node:crypto";
import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAnalysis, getWorkspace, requireUser, seedDemo } from "@/lib/data";
import { CLARIFICATION_DELAY_DAYS, CLARIFICATION_REPLIES, FX_RATE, REPLIES } from "@/lib/demo/script";
import { runScenario, ScenarioSpec } from "@/lib/engine/scenario";
import { withDefaults, type Assumptions } from "@/lib/engine/types";
import { kindOf } from "@/lib/extract/prepare";
import { buildMemo } from "@/lib/memo";
import type { StageKey } from "@/lib/lifecycle";
import type { Rfx } from "@/lib/types";

const MAX_UPLOAD = 10 * 1024 * 1024;
const MAX_UPLOADS_PER_ACCOUNT = 20;

async function current() {
  const { supabase, user } = await requireUser();
  const { data: rfx } = await supabase.from("rfx").select("*").single<Rfx>();
  if (!rfx) throw new Error("No RFx");
  return { supabase, user, rfx };
}

async function log(rfxId: string, label: string, entity: string, entityId: string | null, undo: unknown) {
  const { supabase } = await requireUser();
  await supabase.from("change_log").insert({ rfx_id: rfxId, label, entity, entity_id: entityId, undo });
}

/** Reset demo (FR-0.5): replaces the user's data with a fresh demo copy. */
export async function resetDemo() {
  const { supabase, user } = await requireUser();
  await seedDemo(supabase, user.id);
  redirect("/rfx");
}

/** Marks tour steps before `step` as done, and optionally moves the lifecycle forward. Never moves backwards. */
export async function reachStep(step: number, stage?: StageKey) {
  if (!Number.isInteger(step) || step < 0 || step > 10) return;
  const { supabase, rfx } = await current();
  const order = ["need", "rfi", "rfp", "rfq", "replies", "analysis", "award", "po"];
  const update: Record<string, unknown> = {};
  if (step > rfx.tour_step) update.tour_step = step;
  if (stage && order.indexOf(stage) > order.indexOf(rfx.stage)) update.stage = stage;
  if (Object.keys(update).length) {
    await supabase.from("rfx").update(update).eq("id", rfx.id);
    refresh();
  }
}

/** @deprecated kept for older clients; use reachStep. */
export async function completeTourStep(step: number) {
  return reachStep(step);
}

export async function setTourHidden(hidden: boolean) {
  const { supabase, rfx } = await current();
  await supabase.from("rfx").update({ tour_hidden: hidden }).eq("id", rfx.id);
  refresh();
}

// ---------------- S4: RFQ draft ----------------

export async function updateLineQty(lineId: string, field: "qty_p1" | "qty_p2", value: number) {
  if (!["qty_p1", "qty_p2"].includes(field) || !Number.isInteger(value) || value < 0 || value > 10_000_000) return { error: "Enter a whole number of pieces." };
  const { supabase, rfx } = await current();
  if (rfx.rules_locked_at) return { error: "The RFQ is locked and sent." };
  const { data: line } = await supabase.from("line_items").select("*").eq("id", lineId).single();
  if (!line) return { error: "Line not found" };
  await supabase.from("line_items").update({ [field]: value }).eq("id", lineId);
  await log(rfx.id, `Changed ${line.item_code} ${field === "qty_p1" ? "Plant 1" : "Plant 2"} quantity ${line[field].toLocaleString("en-IN")} → ${value.toLocaleString("en-IN")}`, "line_items", lineId, { op: "line", id: lineId, field, value: line[field] });
  refresh();
  return { error: null };
}

const LockRules = z.object({ required_q: z.array(z.number().int()), min_score: z.number().int().min(0).max(100) });

/** FR-1.7 + FR-2.1: freeze the evaluation rules, then send the RFQ to the 5 vendors (simulated). */
export async function lockAndSend(rules: z.infer<typeof LockRules>) {
  const r = LockRules.parse(rules);
  const { supabase, rfx } = await current();
  if (rfx.rules_locked_at) redirect("/rfx/send");
  if (!rfx.drafted_at) throw new Error("Draft the RFQ first.");
  const { data: vendors } = await supabase.from("vendors").select("*").eq("rfx_id", rfx.id).order("code");
  const now = new Date().toISOString();
  revalidatePath("/rfx", "layout");
  await supabase.from("rfx").update({
    rules: { ...r, fx_rate: FX_RATE, fx_date: now.slice(0, 10), basis: ["₹ per piece", "Before GST", "Delivered to each plant", `1 USD = ₹${FX_RATE.toFixed(2)}`, "Price tier = each plant's own volume"] },
    rules_locked_at: now, sent_at: now, stage: "replies", tour_step: Math.max(rfx.tour_step, 3),
  }).eq("id", rfx.id);
  await supabase.from("messages").insert(
    (vendors ?? []).map((v) => ({
      rfx_id: rfx.id, vendor_id: v.id, direction: "out", kind: "rfq", from_addr: "pavan@sunrise-consumer.example", to_addr: v.email,
      subject: `${rfx.code} · ${rfx.title}, quote by Day ${rfx.due_day}`,
      body: (rfx.cover_email ?? "").replace(/^Dear Supplier,/, `Dear ${v.name},`), day: 0,
    })),
  );
  await supabase.from("vendors").update({ status: "sent" }).eq("rfx_id", rfx.id);
  redirect("/rfx/send");
}

// ---------------- S5/S6: replies ----------------

/** FR-2.2: jump the demo clock 9 days; the 5 seeded replies land and processing starts by itself. */
export async function fastForward() {
  const { supabase, rfx } = await current();
  if (!rfx.sent_at) throw new Error("Send the RFQ first.");
  const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("kind", "reply");
  if (!count) {
    const { data: vendors } = await supabase.from("vendors").select("id, code, email").eq("rfx_id", rfx.id);
    for (const r of REPLIES) {
      const v = vendors!.find((x) => x.code === r.vendor_code)!;
      const { data: m } = await supabase.from("messages").insert({
        rfx_id: rfx.id, vendor_id: v.id, direction: "in", kind: "reply", from_addr: v.email, to_addr: "pavan@sunrise-consumer.example",
        subject: r.subject, body: r.body, day: r.day, late: r.day > rfx.due_day,
      }).select("id").single();
      if (r.attachments.length) {
        await supabase.from("attachments").insert(r.attachments.map((a) => ({
          message_id: m!.id, filename: a.filename, kind: a.kind, mime: a.mime, storage: "seed", path: a.filename,
        })));
      }
      await supabase.from("processing_runs").insert({ rfx_id: rfx.id, message_id: m!.id, vendor_id: v.id });
    }
    await supabase.from("vendors").update({ status: "replied" }).eq("rfx_id", rfx.id);
  }
  await supabase.from("rfx").update({ demo_day: Math.max(rfx.demo_day, 9), tour_step: Math.max(rfx.tour_step, 4) }).eq("id", rfx.id);
  revalidatePath("/rfx", "layout");
  redirect("/rfx/inbox");
}

/** FR-2.4: register a reply the browser uploaded to storage (or pasted text), and queue it for processing. */
export async function registerUpload(input: { vendorCode: string; path?: string; filename?: string; mime?: string; size?: number; text?: string }) {
  const { supabase, user, rfx } = await current();
  if (!rfx.drafted_at) return { error: "Draft the RFQ first, so there are lines to match the quote against." };
  const { data: vendor } = await supabase.from("vendors").select("id, email, name").eq("code", input.vendorCode).single();
  if (!vendor) return { error: "Pick which vendor this reply is from." };
  const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("kind", "upload");
  if ((count ?? 0) >= MAX_UPLOADS_PER_ACCOUNT) return { error: `You've reached the limit of ${MAX_UPLOADS_PER_ACCOUNT} uploads for this demo. Reset the demo to start again.` };

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

  const { data: m, error } = await supabase.from("messages").insert({
    rfx_id: rfx.id, vendor_id: vendor.id, direction: "in", kind: "upload", from_addr: vendor.email, to_addr: "pavan@sunrise-consumer.example",
    subject: attachment ? `Uploaded: ${input.filename}` : "Pasted email text", body, day: rfx.demo_day,
  }).select("id").single();
  if (error) return { error: error.message };
  if (attachment) await supabase.from("attachments").insert({ ...attachment, message_id: m.id });
  const { data: run } = await supabase.from("processing_runs").insert({ rfx_id: rfx.id, message_id: m.id, vendor_id: vendor.id }).select("id").single();
  if (rfx.stage === "rfq") await supabase.from("rfx").update({ stage: "replies" }).eq("id", rfx.id);
  return { error: null, runId: run!.id as string };
}

export async function newUploadPath(filename: string) {
  const { user } = await requireUser();
  const safe = filename.replace(/[^\w.\-]+/g, "_").slice(-80);
  return `${user.id}/${randomUUID()}-${safe}`;
}

// ---------------- S7–S9: review, edits, assumptions, undo ----------------

export async function acceptIssue(issueId: string) {
  const { supabase, rfx } = await current();
  const { data: issue } = await supabase.from("issues").select("*").eq("id", issueId).single();
  if (!issue || issue.status === "resolved") return;
  await supabase.from("issues").update({ status: "resolved", resolution: "Accepted by buyer", resolved_at: new Date().toISOString() }).eq("id", issueId);
  if (issue.quote_value_id) await supabase.from("quote_values").update({ review: "accepted" }).eq("id", issue.quote_value_id);
  await log(rfx.id, `Accepted: ${issue.title}`, "issues", issueId, { op: "issue", id: issueId, status: issue.status });
  refresh();
}

/** FR-4.3: clears the easy ones at once; only real issues remain. */
export async function acceptAllHighConfidence() {
  const { supabase, rfx } = await current();
  const { data: issues } = await supabase.from("issues").select("id, title, status").eq("status", "open").eq("confidence", "high").eq("askable", false);
  if (!issues?.length) return;
  await supabase.from("issues").update({ status: "resolved", resolution: "Accepted (high confidence)", resolved_at: new Date().toISOString() }).in("id", issues.map((i) => i.id));
  await log(rfx.id, `Accepted ${issues.length} high-confidence item${issues.length > 1 ? "s" : ""}`, "issues", null, { op: "issues", ids: issues.map((i) => i.id), status: "open" });
  refresh();
}

/** Buyer enters a value (₹ per piece, pre-GST, delivered). Old value kept in history; undoable. */
export async function editQuote(vendorCode: string, lineId: string, pricePerPiece: number, reason: string) {
  if (!(pricePerPiece > 0) || pricePerPiece > 100_000) return { error: "Enter a price per piece in ₹." };
  const { supabase, rfx } = await current();
  const { data: vendor } = await supabase.from("vendors").select("id, code").eq("code", vendorCode).single();
  const { data: line } = await supabase.from("line_items").select("id, line_no").eq("id", lineId).single();
  if (!vendor || !line) return { error: "Not found" };
  const { data: old } = await supabase.from("quote_values").select("id").eq("vendor_id", vendor.id).eq("line_item_id", lineId).eq("is_current", true).maybeSingle();
  if (old) await supabase.from("quote_values").update({ is_current: false, replaced_at: new Date().toISOString() }).eq("id", old.id);
  const { data: q } = await supabase.from("quote_values").insert({
    rfx_id: rfx.id, vendor_id: vendor.id, line_item_id: lineId, provenance: "manual", confidence: "high", review: "edited",
    raw: { price: pricePerPiece, currency: "INR", unit: "piece", bundle_size: null, gst_included: false, tiers: [] },
    source: { attachment_id: null, attachment: null, kind: "text", ref: "Entered by buyer", snippet: reason || "Manual entry", page: null, cell: null, paragraph: null, bbox: null },
  }).select("id").single();
  // Fixing a value closes the flags on that cell (it becomes freight-included per piece as entered).
  await supabase.from("issues").update({ status: "resolved", resolution: "Value entered by buyer", resolved_at: new Date().toISOString() })
    .eq("vendor_id", vendor.id).eq("line_item_id", lineId).neq("status", "resolved");
  await log(rfx.id, `Set ${vendor.code} line ${line.line_no} to ₹${pricePerPiece.toFixed(2)} per piece`, "quote_values", q!.id, { op: "quote", newId: q!.id, oldId: old?.id ?? null });
  refresh();
  return { error: null };
}

export async function setAssumptions(patch: Partial<Assumptions>, label: string) {
  const { supabase, rfx } = await current();
  const before = withDefaults(rfx.assumptions, FX_RATE);
  const after: Assumptions = {
    fx_rate: patch.fx_rate ?? before.fx_rate,
    freight: { ...before.freight, ...patch.freight },
    discount_mode: { ...before.discount_mode, ...patch.discount_mode },
    weight_overrides: { ...before.weight_overrides, ...patch.weight_overrides },
  };
  await supabase.from("rfx").update({ assumptions: after }).eq("id", rfx.id);
  await log(rfx.id, label, "rfx", rfx.id, { op: "assumptions", value: before });
  refresh();
}

/** FR-4.13: undo any logged change. */
export async function undoChange(changeId: string) {
  const { supabase, rfx } = await current();
  const { data: c } = await supabase.from("change_log").select("*").eq("id", changeId).single();
  if (!c || c.undone) return;
  const u = c.undo as Record<string, unknown> & { op: string };
  if (u.op === "line") await supabase.from("line_items").update({ [u.field as string]: u.value }).eq("id", u.id);
  if (u.op === "issue") await supabase.from("issues").update({ status: u.status, resolution: null, resolved_at: null }).eq("id", u.id);
  if (u.op === "issues") await supabase.from("issues").update({ status: u.status, resolution: null, resolved_at: null }).in("id", u.ids as string[]);
  if (u.op === "assumptions") await supabase.from("rfx").update({ assumptions: u.value }).eq("id", rfx.id);
  if (u.op === "quote") {
    await supabase.from("quote_values").update({ is_current: false }).eq("id", u.newId);
    if (u.oldId) await supabase.from("quote_values").update({ is_current: true, replaced_at: null }).eq("id", u.oldId);
  }
  await supabase.from("change_log").update({ undone: true }).eq("id", changeId);
  refresh();
}

// ---------------- S10: clarification (Improvement A) ----------------

/** FR-4.7: send one consolidated email (simulated). Seeded vendors reply 2 days later (FR-4.8). */
export async function sendClarification(vendorCode: string, subject: string, body: string, issueIds: string[]) {
  const { supabase, rfx } = await current();
  const { data: vendor } = await supabase.from("vendors").select("*").eq("code", vendorCode).single();
  if (!vendor) return { error: "Vendor not found" };
  const day = rfx.demo_day;
  await supabase.from("messages").insert({
    rfx_id: rfx.id, vendor_id: vendor.id, direction: "out", kind: "clarification_request", from_addr: "pavan@sunrise-consumer.example",
    to_addr: vendor.email, subject, body, day,
  });
  if (issueIds.length) await supabase.from("issues").update({ status: "asked" }).in("id", issueIds).eq("status", "open");
  await supabase.from("vendors").update({ status: "clarification_requested" }).eq("id", vendor.id);
  await supabase.from("rfx").update({ tour_step: Math.max(rfx.tour_step, 7) }).eq("id", rfx.id);

  const scripted = CLARIFICATION_REPLIES.find((r) => r.vendor_code === vendorCode);
  const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.id).eq("kind", "clarification_reply");
  let runId: string | null = null;
  if (scripted && !count) {
    const replyDay = day + CLARIFICATION_DELAY_DAYS;
    const { data: m } = await supabase.from("messages").insert({
      rfx_id: rfx.id, vendor_id: vendor.id, direction: "in", kind: "clarification_reply", from_addr: vendor.email,
      to_addr: "pavan@sunrise-consumer.example", subject: scripted.subject, body: scripted.body, day: replyDay,
    }).select("id").single();
    const { data: run } = await supabase.from("processing_runs").insert({ rfx_id: rfx.id, message_id: m!.id, vendor_id: vendor.id }).select("id").single();
    runId = run!.id;
    await supabase.from("rfx").update({ demo_day: Math.max(rfx.demo_day, replyDay) }).eq("id", rfx.id);
  }
  revalidatePath("/rfx", "layout");
  return { error: null, runId, replyExpected: Boolean(scripted) };
}

// ---------------- S7b/S12: scenarios and award ----------------

export async function saveScenario(spec: ScenarioSpec, name: string) {
  const parsed = ScenarioSpec.parse(spec);
  const a = await getAnalysis();
  const result = runScenario(a.input, a.comparison, a.scenarioContracts, parsed);
  const { data } = await a.supabase.from("scenarios").insert({ rfx_id: a.rfx.id, name: name.trim().slice(0, 80) || parsed.name, spec: parsed, result }).select("id").single();
  refresh();
  return { id: data!.id as string };
}

export async function deleteScenario(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("scenarios").delete().eq("id", id);
  refresh();
}

/** FR-6.1/6.2: recompute the saved scenario with today's numbers and build the memo. */
export async function recommendAward(scenarioId: string) {
  const a = await getAnalysis();
  const sc = a.scenarios.find((s) => s.id === scenarioId);
  if (!sc) throw new Error("Scenario not found");
  const result = runScenario(a.input, a.comparison, a.scenarioContracts, sc.spec);
  const content = await buildMemo(a.rfx, result, a.input, a.comparison, a.issues);
  await a.supabase.from("award_memos").delete().eq("rfx_id", a.rfx.id);
  await a.supabase.from("award_memos").insert({ rfx_id: a.rfx.id, scenario_id: sc.id, content });
  await a.supabase.from("rfx").update({ stage: "po", tour_step: 10 }).eq("id", a.rfx.id);
  revalidatePath("/rfx", "layout"); // the strip and tour live in the layout
  redirect("/rfx/award");
}

export async function clearChat() {
  const { supabase, rfx } = await current();
  await supabase.from("chat_messages").delete().eq("rfx_id", rfx.id);
  refresh();
}

// keep getWorkspace referenced for type inference in callers
export type WorkspaceData = Awaited<ReturnType<typeof getWorkspace>>;
