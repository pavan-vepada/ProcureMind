// Everything the analysis screens need for one RFx, loaded in parallel, plus the computed comparison.
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildComparison, type ComparisonInput, type Quote } from "@/lib/engine/comparison";
import { DEFAULT_RULES, type Certificate, type Question } from "@/lib/engine/questionnaire";
import type { Contract } from "@/lib/engine/scenario";
import { withDefaults, type Line } from "@/lib/engine/types";
import type { ContractInfo } from "@/lib/extract/resolve";
import type { Attachment, ChangeLogEntry, ChatMessage, IssueRecord, Message, Rfx, Run, ScenarioRecord, VendorRecord } from "@/lib/types";

function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`Could not load ${what}: ${r.error.message}`);
  return r.data as T;
}

export async function loadAnalysis(supabase: SupabaseClient, rfx: Rfx) {
  const id = rfx.id;
  const [vendors, lines, questions, quotes, issues, answers, certificates, contracts, runs, messages, attachments, scenarios, chat, changes, memo] =
    await Promise.all([
      supabase.from("vendors").select("*").eq("rfx_id", id).order("code"),
      supabase.from("line_items").select("*").eq("rfx_id", id).order("line_no"),
      supabase.from("questions").select("*").eq("rfx_id", id).order("q_no"),
      supabase.from("quote_values").select("*").eq("rfx_id", id).eq("is_current", true),
      supabase.from("issues").select("*").eq("rfx_id", id).order("created_at"),
      supabase.from("answers").select("vendor_id, q_no, met, answer, source").eq("rfx_id", id),
      supabase.from("certificates").select("vendor_id, name, valid_until, source").eq("rfx_id", id),
      supabase.from("contracts").select("vendor_code, contract_no, valid_from, valid_to, contract_lines(line_no, spec_key, price, unit, description)").eq("rfx_id", id),
      supabase.from("processing_runs").select("*").eq("rfx_id", id).order("created_at"),
      supabase.from("messages").select("*").eq("rfx_id", id).order("received_at"),
      supabase.from("attachments").select("*, messages!inner(rfx_id)").eq("messages.rfx_id", id),
      supabase.from("scenarios").select("*").eq("rfx_id", id).order("created_at"),
      supabase.from("chat_messages").select("*").eq("rfx_id", id).order("created_at"),
      supabase.from("change_log").select("*").eq("rfx_id", id).order("created_at", { ascending: false }).limit(20),
      supabase.from("award_memos").select("id").eq("rfx_id", id).limit(1),
    ]);

  const vendorRows = must<VendorRecord[]>(vendors, "vendors");
  const runRows = must<Run[]>(runs, "processing runs");
  const contractRows = must<(Omit<ContractInfo, "lines"> & { valid_from: string; valid_to: string; contract_lines: ContractInfo["lines"] })[]>(contracts, "contracts");
  const processedVendorIds = [...new Set(runRows.filter((r) => r.status === "done" && r.vendor_id).map((r) => r.vendor_id!))];

  const input: ComparisonInput = {
    lines: must<Line[]>(lines, "lines"),
    vendors: vendorRows,
    quotes: must<Quote[]>(quotes, "quotes"),
    issues: must<IssueRecord[]>(issues, "issues"),
    answers: must<ComparisonInput["answers"]>(answers, "answers"),
    certificates: must<Certificate[]>(certificates, "certificates"),
    questions: must<Question[]>(questions, "questions"),
    rules: rfx.rules ?? DEFAULT_RULES,
    assumptions: withDefaults(rfx.assumptions),
    processedVendorIds,
    today: new Date().toISOString().slice(0, 10),
  };

  return {
    rfx,
    vendors: vendorRows,
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
    hasMemo: (must<{ id: string }[]>(memo, "memo") ?? []).length > 0,
  };
}

export type Analysis = Awaited<ReturnType<typeof loadAnalysis>>;
