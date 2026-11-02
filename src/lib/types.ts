import type { Assumptions } from "@/lib/engine/types";
import type { Rules } from "@/lib/engine/questionnaire";
import type { StageKey } from "@/lib/lifecycle";

export type InternalRequest = { from: string; day: number; subject: string; body: string };

export type CopilotNote = { kind: "gap" | "info" | "fix"; text: string };

export type Rfx = {
  id: string;
  code: string;
  title: string;
  buyer_company: string;
  category: string;
  dataset: string | null;
  created_at: string;
  updated_at: string;
  stage: StageKey;
  tour_step: number;
  tour_hidden: boolean;
  internal_request: InternalRequest;
  drafted_at: string | null;
  draft_source: "ai" | "prepared" | null;
  cover_email: string | null;
  payment_days: number | null;
  validity_days: number | null;
  due_day: number;
  rules: (Rules & { fx_rate: number; fx_date: string; basis: string[] }) | null;
  rules_locked_at: string | null;
  sent_at: string | null;
  demo_day: number;
  assumptions: Partial<Assumptions>;
  copilot_notes: CopilotNote[];
};

export type VendorStatus = "not_sent" | "sent" | "replied" | "clarification_requested";

export type VendorRecord = {
  id: string;
  code: string;
  name: string;
  email: string;
  reply_format: "excel" | "pdf" | "word" | "photo" | "email";
  rfi_note: string;
  rfp_summary: string;
  status: VendorStatus;
  payment_days: number | null;
  validity_days: number | null;
  lead_time_days: number | null;
  freight: "included" | "extra" | "unclear" | null;
  freight_note: string | null;
  discount: { pct: number; min_qty: number | null; condition: string; scope_clear: boolean } | null;
};
/** @deprecated use VendorRecord */
export type Vendor = VendorRecord;

export type RfiResponse = {
  id: string;
  sort: number;
  vendor_name: string;
  iso_9001: boolean;
  fsc: boolean;
  monthly_capacity: string;
  shortlisted: boolean;
  reason: string;
};

export type Message = {
  id: string;
  vendor_id: string | null;
  direction: "in" | "out";
  kind: "rfq" | "reply" | "clarification_request" | "clarification_reply" | "upload";
  from_addr: string;
  to_addr: string;
  subject: string;
  body: string;
  day: number;
  late: boolean;
  received_at: string;
  created_at: string;
};

export type Attachment = {
  id: string;
  message_id: string;
  filename: string;
  kind: "excel" | "pdf" | "word" | "photo" | "certificate" | "text";
  mime: string;
  storage: "seed" | "upload";
  path: string;
  size_bytes: number | null;
};

export type Run = {
  id: string;
  rfx_id: string;
  message_id: string;
  vendor_id: string | null;
  status: "queued" | "running" | "done" | "failed";
  step: string;
  progress: number;
  lines_found: number | null;
  error: string | null;
  summary: { saved_run?: boolean; model?: string; seconds?: number; issues?: number; kind?: string } | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export type IssueRecord = {
  id: string;
  vendor_id: string;
  line_item_id: string | null;
  quote_value_id: string | null;
  kind: string;
  title: string;
  detail: string;
  confidence: "high" | "medium" | "low" | null;
  source: import("@/lib/engine/comparison").Source | null;
  askable: boolean;
  status: "open" | "asked" | "resolved";
  resolution: string | null;
  created_at: string;
};

export type ScenarioRecord = {
  id: string;
  name: string;
  spec: import("@/lib/engine/scenario").ScenarioSpec;
  result: import("@/lib/engine/scenario").ScenarioResult;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  payload: AskPayload | null;
  created_at: string;
};

export type AskPayload = {
  kind: "answer" | "clarify" | "issues" | "profile" | "error";
  result?: import("@/lib/engine/scenario").ScenarioResult;
  previousTotal?: number | null;
  choices?: string[];
  table?: { columns: string[]; rows: (string | number)[][] };
  explanationChecked?: boolean;
  scenarioId?: string | null;
};

export type ChangeLogEntry = {
  id: string;
  label: string;
  entity: string;
  entity_id: string | null;
  undo: unknown;
  undone: boolean;
  created_at: string;
};
