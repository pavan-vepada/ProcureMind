// Data access layer: every read of the user's data goes through here, after checking the session.
import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { buildSeedArgs } from "@/lib/demo/seed";
import { buildComparison, type ComparisonInput, type Quote } from "@/lib/engine/comparison";
import { DEFAULT_RULES, type Certificate, type Question } from "@/lib/engine/questionnaire";
import type { Contract } from "@/lib/engine/scenario";
import { withDefaults, type Line } from "@/lib/engine/types";
import type { ContractInfo } from "@/lib/extract/resolve";
import type {
  Attachment, ChangeLogEntry, ChatMessage, IssueRecord, Message, RfiResponse, Rfx, Run, ScenarioRecord, VendorRecord,
} from "@/lib/types";

/** The signed-in user, verified with Supabase. Redirects to the landing page if signed out. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/");
  return { supabase, user: data.user };
});

/** Replaces the user's demo copy with a fresh one (first login and Reset demo). */
export async function seedDemo(supabase: SupabaseClient, userId: string) {
  // Uploaded files belong to the old copy; remove them through the Storage API.
  const { data: files } = await supabase.storage.from("uploads").list(userId, { limit: 1000 });
  if (files?.length) await supabase.storage.from("uploads").remove(files.map((f) => `${userId}/${f.name}`));
  const { error } = await supabase.rpc("seed_demo", buildSeedArgs());
  if (error) throw new Error(`Could not create the demo copy: ${error.message}`);
}

async function loadRfx(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("rfx").select("*").maybeSingle<Rfx>();
  if (error) throw new Error(`Could not load the RFx: ${error.message}`);
  return data;
}

function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`Could not load ${what}: ${r.error.message}`);
  return r.data as T;
}

/** The user's RFx with its vendors and RFI results. Creates the demo copy on first visit (FR-0.4). */
export const getWorkspace = cache(async () => {
  const { supabase, user } = await requireUser();

  let rfx = await loadRfx(supabase);
  if (!rfx) {
    try {
      await seedDemo(supabase, user.id);
    } catch (err) {
      // Two first-visit requests can race; if the other one won, its copy is what we load.
      if (!(await loadRfx(supabase))) throw err;
    }
    rfx = await loadRfx(supabase);
  }
  if (!rfx) throw new Error("The demo copy could not be created.");

  const [vendors, rfi] = await Promise.all([
    supabase.from("vendors").select("*").eq("rfx_id", rfx.id).order("code"),
    supabase.from("rfi_responses").select("*").eq("rfx_id", rfx.id).order("sort"),
  ]);
  return {
    supabase,
    user,
    rfx,
    vendors: must<VendorRecord[]>(vendors, "vendors"),
    rfi: must<RfiResponse[]>(rfi, "RFI results"),
  };
});

/** Everything the analysis screens need, loaded in parallel. */
export const getAnalysis = cache(async () => {
  const ws = await getWorkspace();
  const { supabase, rfx } = ws;
  const id = rfx.id;
  const [lines, questions, quotes, issues, answers, certificates, contracts, runs, messages, attachments, scenarios, chat, changes] =
    await Promise.all([
      supabase.from("line_items").select("*").eq("rfx_id", id).order("line_no"),
      supabase.from("questions").select("*").eq("rfx_id", id).order("q_no"),
      supabase.from("quote_values").select("*").eq("rfx_id", id).eq("is_current", true),
      supabase.from("issues").select("*").eq("rfx_id", id).order("created_at"),
      supabase.from("answers").select("vendor_id, q_no, met, answer, source").eq("rfx_id", id),
      supabase.from("certificates").select("vendor_id, name, valid_until, source").eq("rfx_id", id),
      supabase.from("contracts").select("vendor_code, contract_no, valid_from, valid_to, contract_lines(line_no, spec_key, price, unit, description)").eq("rfx_id", id),
      supabase.from("processing_runs").select("*").eq("rfx_id", id).order("created_at"),
      supabase.from("messages").select("*").eq("rfx_id", id).order("day").order("created_at"),
      supabase.from("attachments").select("*, messages!inner(rfx_id)").eq("messages.rfx_id", id),
      supabase.from("scenarios").select("*").eq("rfx_id", id).order("created_at"),
      supabase.from("chat_messages").select("*").eq("rfx_id", id).order("created_at"),
      supabase.from("change_log").select("*").eq("rfx_id", id).order("created_at", { ascending: false }).limit(20),
    ]);

  const lineRows = must<Line[]>(lines, "lines");
  const runRows = must<Run[]>(runs, "processing runs");
  const contractRows = must<(Omit<ContractInfo, "lines"> & { valid_from: string; valid_to: string; contract_lines: ContractInfo["lines"] })[]>(contracts, "contracts");

  const processedVendorIds = [...new Set(runRows.filter((r) => r.status === "done" && r.vendor_id).map((r) => r.vendor_id!))];
  const today = new Date().toISOString().slice(0, 10);
  const input: ComparisonInput = {
    lines: lineRows,
    vendors: ws.vendors,
    quotes: must<Quote[]>(quotes, "quotes"),
    issues: must<IssueRecord[]>(issues, "issues"),
    answers: must<ComparisonInput["answers"]>(answers, "answers"),
    certificates: must<Certificate[]>(certificates, "certificates"),
    questions: must<Question[]>(questions, "questions"),
    rules: rfx.rules ?? DEFAULT_RULES,
    assumptions: withDefaults(rfx.assumptions),
    processedVendorIds,
    today,
  };

  return {
    ...ws,
    input,
    comparison: buildComparison(input),
    issues: input.issues as IssueRecord[],
    contracts: contractRows.map((c) => ({ ...c, lines: c.contract_lines })),
    scenarioContracts: contractRows.map<Contract>((c) => ({
      vendor_code: c.vendor_code, contract_no: c.contract_no, lines: c.contract_lines.map((l) => ({ line_no: l.line_no, price: Number(l.price) })),
    })),
    runs: runRows,
    messages: must<Message[]>(messages, "messages"),
    attachments: must<Attachment[]>(attachments, "attachments"),
    scenarios: must<ScenarioRecord[]>(scenarios, "scenarios"),
    chat: must<ChatMessage[]>(chat, "chat"),
    changes: must<ChangeLogEntry[]>(changes, "change log"),
  };
});
