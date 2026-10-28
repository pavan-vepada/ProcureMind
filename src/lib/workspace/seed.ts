// Creates RFx from the sample datasets, at any stage: drafted, sent, with replies read (using the recorded
// ideal reading, through the same save path as live AI), scenarios saved, award memo built.
// Used for a new buyer's workspace, for "New RFx from an internal request", and for "Add sample replies".
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { preparedCoverEmail } from "@/lib/copilot/draft";
import { dataset, FX_RATE, STANDARD_QUESTIONS, type Dataset } from "@/lib/demo/datasets";
import { runScenario, type ScenarioSpec } from "@/lib/engine/scenario";
import { money } from "@/lib/format";
import type { Line } from "@/lib/engine/types";
import { asExtraction } from "@/lib/extract/schema";
import type { StageKey } from "@/lib/lifecycle";
import { buildMemo } from "@/lib/memo";
import { contractInfo, doneText, resolveAndSave } from "@/lib/pipeline/process";
import type { Attachment, Message, Rfx, VendorRecord } from "@/lib/types";
import { loadAnalysis } from "./analysis";

const DAY = 864e5;
const iso = (t: number) => new Date(t).toISOString();

/** A half-built sample RFx is worse than none: every write must succeed. */
function must<T extends { error: { message: string } | null }>(res: T, what: string): T {
  if (res.error) throw new Error(`${what} failed: ${res.error.message}`);
  return res;
}
const BUYER_EMAIL = "pavan@sunrise-consumer.example";
const COMPANY = "Sunrise Consumer Goods";

const SPLIT_PASSING: ScenarioSpec = {
  name: "Split by line, passing vendors", passed_only: true, exclude_vendors: [], only_vendors: [], rule: "cheapest_per_line",
  single_vendor: null, volume: "per_plant", price_match: null, line_filter: null,
};

export const RULES = (fxDate: string) => ({
  required_q: [1, 3], min_score: 70, fx_rate: FX_RATE, fx_date: fxDate,
  basis: ["₹ per piece", "Before GST", "Delivered to each plant", `1 USD = ₹${FX_RATE.toFixed(2)}`, "Price tier = each plant's own volume"],
});

type Plan = {
  stage: StageKey;
  createdDaysAgo: number;
  sentDaysAgo: number | null; // null = not sent
  drafted: boolean;
  read: string[] | "all"; // replies already read
  arrived: string[]; // replies arrived, waiting to be read (read live when the Replies tab opens)
  scenarios: ScenarioSpec[];
  memo: boolean;
  touchedHoursAgo: number;
};

/** A new buyer's workspace: RFx at every stage. */
export const SAMPLE_WORKSPACE: { dataset: string; plan: Plan }[] = [
  { dataset: "core", plan: { stage: "analysis", createdDaysAgo: 16, sentDaysAgo: 12, drafted: true, read: "all", arrived: [], scenarios: [SPLIT_PASSING], memo: false, touchedHoursAgo: 1 } },
  { dataset: "export", plan: { stage: "replies", createdDaysAgo: 9, sentDaysAgo: 6, drafted: true, read: ["V1", "V2"], arrived: ["V3"], scenarios: [], memo: false, touchedHoursAgo: 3 } },
  { dataset: "buffer", plan: { stage: "rfq", createdDaysAgo: 2, sentDaysAgo: null, drafted: true, read: [], arrived: [], scenarios: [], memo: false, touchedHoursAgo: 20 } },
  {
    dataset: "inner",
    plan: {
      stage: "po", createdDaysAgo: 52, sentDaysAgo: 45, drafted: true, read: "all", arrived: [], memo: true, touchedHoursAgo: 24 * 30,
      scenarios: [{ ...SPLIT_PASSING, name: "Split by line, combined volumes", volume: "combined" }],
    },
  },
];

/** Creates the sample workspace once per user. Returns false if another request is already doing it. */
export async function seedWorkspace(supabase: SupabaseClient): Promise<boolean> {
  const { error } = await supabase.from("workspace_seeds").insert({});
  if (error) return false;
  for (let attempt = 1; ; attempt++) {
    const results = await Promise.allSettled(SAMPLE_WORKSPACE.map((s) => createFromDataset(supabase, dataset(s.dataset)!, s.plan)));
    const failed = results.find((r) => r.status === "rejected");
    if (!failed) {
      must(await supabase.from("workspace_seeds").update({ ready_at: new Date().toISOString() }).not("owner_id", "is", null), "Finishing the workspace");
      return true;
    }
    // Start again from nothing rather than leave a half-built RFx behind.
    await supabase.from("rfx").delete().in("dataset", SAMPLE_WORKSPACE.map((s) => s.dataset));
    if (attempt === 2) {
      await supabase.from("workspace_seeds").delete().not("owner_id", "is", null);
      throw (failed as PromiseRejectedResult).reason;
    }
  }
}

export async function createFromDataset(supabase: SupabaseClient, ds: Dataset, plan: Plan, code = ds.code): Promise<string> {
  const now = Date.now();
  const createdAt = now - plan.createdDaysAgo * DAY;
  const sentAt = plan.sentDaysAgo !== null ? now - plan.sentDaysAgo * DAY : null;
  const rfxId = randomUUID();

  const rfx = {
    id: rfxId, code, title: ds.title, buyer_company: COMPANY, category: ds.category, dataset: ds.key, stage: plan.stage,
    tour_step: 10, tour_hidden: true, internal_request: ds.request, created_at: iso(createdAt), updated_at: iso(now - plan.touchedHoursAgo * 36e5),
    drafted_at: plan.drafted ? iso(createdAt + DAY) : null, draft_source: plan.drafted ? "ai" : null,
    cover_email: plan.drafted ? preparedCoverEmail(COMPANY, 7) : null, payment_days: plan.drafted ? 60 : null, validity_days: plan.drafted ? 90 : null,
    due_day: 7, rules: sentAt ? RULES(iso(sentAt).slice(0, 10)) : null, rules_locked_at: sentAt ? iso(sentAt) : null, sent_at: sentAt ? iso(sentAt) : null,
    demo_day: sentAt ? Math.floor((now - sentAt) / DAY) : 0,
    assumptions: { fx_rate: FX_RATE, freight: {}, discount_mode: {}, weight_overrides: {} },
    copilot_notes: plan.drafted ? [{ kind: "info", text: "Every quantity and size was checked against the volume sheet." }] : [],
  };
  const r1 = await supabase.from("rfx").insert(rfx);
  if (r1.error) throw new Error(`Creating ${code} failed: ${r1.error.message}`);

  const read = plan.read === "all" ? ds.vendors.map((v) => v.code) : plan.read;
  const replied = new Set([...read, ...plan.arrived]);
  const vendors: VendorRecord[] = ds.vendors.map((v) => ({
    id: randomUUID(), ...v, reply_format: v.reply_format as VendorRecord["reply_format"],
    status: replied.has(v.code) ? "replied" : sentAt ? "sent" : "not_sent",
    payment_days: null, validity_days: null, lead_time_days: null, freight: null, freight_note: null, discount: null,
  }));
  const lines: Line[] = plan.drafted
    ? ds.lines.map((l) => ({ ...l, id: randomUUID(), category: l.category as Line["category"] }))
    : [];

  const ops = await Promise.all([
    supabase.from("vendors").insert(vendors.map((v) => ({
      id: v.id, rfx_id: rfxId, code: v.code, name: v.name, email: v.email, reply_format: v.reply_format, rfi_note: v.rfi_note, rfp_summary: v.rfp_summary, status: v.status,
    }))),
    supabase.from("rfi_responses").insert(ds.rfi.map((r, i) => ({ rfx_id: rfxId, sort: i + 1, ...r }))),
    lines.length
      ? supabase.from("line_items").insert(lines.map((l) => ({
          id: l.id, rfx_id: rfxId, line_no: l.line_no, item_code: l.item_code, description: l.description, category: l.category, ply: l.ply,
          gsm: l.gsm, bf: l.bf, flute: l.flute, length_mm: l.length_mm, width_mm: l.width_mm, height_mm: l.height_mm,
          qty_p1: l.qty_p1, qty_p2: l.qty_p2, spec_key: l.spec_key, is_new: l.is_new,
        })))
      : Promise.resolve({ error: null }),
    plan.drafted ? supabase.from("questions").insert(STANDARD_QUESTIONS.map((q) => ({ rfx_id: rfxId, ...q }))) : Promise.resolve({ error: null }),
  ]);
  const opError = ops.find((o) => o.error)?.error;
  if (opError) throw new Error(`Creating ${code} failed: ${opError.message}`);

  for (const c of ds.contracts) {
    const id = randomUUID();
    must(await supabase.from("contracts").insert({ id, rfx_id: rfxId, vendor_code: c.vendor_code, contract_no: c.contract_no, valid_from: c.valid_from, valid_to: c.valid_to }), "Saving a contract");
    must(await supabase.from("contract_lines").insert(c.lines.map((l) => ({ contract_id: id, ...l }))), "Saving contract lines");
  }

  if (!sentAt) return rfxId;

  must(await supabase.from("messages").insert(vendors.map((v) => ({
    rfx_id: rfxId, vendor_id: v.id, direction: "out", kind: "rfq", from_addr: BUYER_EMAIL, to_addr: v.email,
    subject: `${code} · ${ds.title}, quote by ${new Date(sentAt + 7 * DAY).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
    body: (rfx.cover_email ?? "").replace(/^Dear Supplier,/, `Dear ${v.name},`), day: 0, received_at: iso(sentAt),
  }))), "Saving the sent RFQ emails");

  const rfxRow = rfx as unknown as Rfx;
  await Promise.all(
    [...replied].map(async (vc) => {
      const v = vendors.find((x) => x.code === vc)!;
      const reply = ds.replies.find((x) => x.vendor_code === vc);
      if (!reply) return;
      const { message, attachments } = await insertReply(supabase, rfxRow, v, reply, Math.min(sentAt + reply.day * DAY, now - 2 * 36e5), "reply");
      const isRead = read.includes(vc);
      const runId = randomUUID();
      must(await supabase.from("processing_runs").insert({ id: runId, rfx_id: rfxId, message_id: message.id, vendor_id: v.id }), "Saving a reading run");
      if (!isRead) return;
      const ideal = (ds.ideal as { vendor_code: string }[]).find((x) => x.vendor_code === vc)!;
      const { resolved, closed, fresh } = await resolveAndSave({
        supabase, rfx: rfxRow, vendor: v, lines, contracts: contractInfo(ds.contracts.map((c) => ({ ...c, contract_lines: c.lines }))),
        message, attachments, extraction: asExtraction(ideal), kind: "reply",
      });
      must(await supabase.from("processing_runs").update({
        status: "done", step: doneText("reply", resolved, lines.length, closed.length), progress: 100, lines_found: resolved.linesFound,
        started_at: message.received_at, finished_at: message.received_at,
        summary: { model: "gpt-5.5", seconds: 30 + Math.round(Math.random() * 20), issues: fresh, kind: "reply" },
      }).eq("id", runId), "Finishing a reading run");
    }),
  );

  if (plan.scenarios.length || plan.memo) {
    // Reload: reading the replies added assumptions (e.g. freight estimates) that the scenarios must use.
    const { data: fresh } = must(await supabase.from("rfx").select("*").eq("id", rfxId).single<Rfx>(), "Reloading the RFx");
    const a = await loadAnalysis(supabase, fresh!);
    const saved = [];
    for (const spec of plan.scenarios) {
      const result = runScenario(a.input, a.comparison, a.scenarioContracts, spec);
      const at = iso(now - (plan.touchedHoursAgo + 1) * 36e5);
      const { data } = must(await supabase.from("scenarios").insert({ rfx_id: rfxId, name: spec.name, spec, result, created_at: at }).select("id").single(), "Saving a scenario");
      saved.push({ id: data!.id as string, result });
      // The question that produced this scenario, so the Ask panel shows the buyer's earlier work.
      if (plan.stage === "analysis") {
        const award = result.by_vendor.map((v) => `${v.name} (${v.lines.length} lines)`).join(", ");
        must(await supabase.from("chat_messages").insert([
          { rfx_id: rfxId, role: "user", content: "Split the award: cheapest per line, only vendors who passed the questionnaire", created_at: at },
          {
            rfx_id: rfxId, role: "assistant", created_at: at,
            content: `Award by line to ${award}: total ${money(result.total)}.${result.savings_vs_single && result.cheapest_single ? ` That is ${money(result.savings_vs_single)} below the cheapest single vendor.` : ""} ${result.excluded.map((e) => a.vendors.find((v) => v.code === e.code)?.name ?? e.code).join(" and ")} ${result.excluded.length > 1 ? "are" : "is"} excluded by the locked questionnaire rules.`,
            payload: { kind: "answer", result, previousTotal: null, explanationChecked: false },
          },
        ]), "Saving the earlier question");
      }
    }
    if (plan.memo && saved.length) {
      const last = saved[saved.length - 1];
      const content = await buildMemo(fresh!, last.result, a.input, a.comparison, a.issues, { ai: false });
      must(await supabase.from("award_memos").insert({ rfx_id: rfxId, scenario_id: last.id, content }), "Saving the award memo");
    }
  }
  return rfxId;
}

/** Inserts one inbound reply with its files (stored with the app, read from disk). */
export async function insertReply(
  supabase: SupabaseClient, rfx: Rfx, v: VendorRecord, reply: Dataset["replies"][number], at: number,
  kind: "reply" | "clarification_reply",
): Promise<{ message: Message; attachments: Attachment[] }> {
  const sentAt = rfx.sent_at ? Date.parse(rfx.sent_at) : at;
  const message = {
    id: randomUUID(), rfx_id: rfx.id, vendor_id: v.id, direction: "in" as const, kind, from_addr: v.email, to_addr: BUYER_EMAIL,
    subject: reply.subject, body: reply.body, day: Math.max(0, Math.floor((at - sentAt) / DAY)),
    late: kind === "reply" && at > sentAt + (rfx.due_day ?? 7) * DAY, received_at: iso(at), created_at: iso(at),
  };
  const r = await supabase.from("messages").insert(message);
  if (r.error) throw new Error(`Saving reply failed: ${r.error.message}`);
  const attachments: Attachment[] = reply.attachments.map((a) => ({
    id: randomUUID(), message_id: message.id, filename: a.filename, kind: a.kind, mime: a.mime, storage: "seed", path: a.filename, size_bytes: null,
  }));
  if (attachments.length) must(await supabase.from("attachments").insert(attachments), "Saving reply files");
  return { message: message as unknown as Message, attachments };
}
