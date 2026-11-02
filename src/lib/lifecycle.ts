// Where an RFx is in the procurement lifecycle (PRD FR-1.1).
import type { Rfx } from "@/lib/types";

export const STAGE_KEYS = ["need", "rfi", "rfp", "rfq", "replies", "analysis", "award", "po"] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

/** The five steps shown on every RFx. Need, RFI and RFP are context; PO hand-off is on the roadmap. */
export const STEPS = [
  { key: "request", label: "Request" },
  { key: "rfq", label: "RFQ" },
  { key: "replies", label: "Replies" },
  { key: "analysis", label: "Analysis" },
  { key: "award", label: "Award" },
] as const;

export type Phase = "drafting" | "ready" | "out" | "analysis" | "awarded";

/** The buyer-facing status of an RFx. */
export function phaseOf(rfx: Pick<Rfx, "stage" | "drafted_at" | "sent_at">): Phase {
  if (rfx.stage === "po" || rfx.stage === "award") return "awarded";
  if (rfx.stage === "analysis") return "analysis";
  if (rfx.sent_at) return "out";
  if (rfx.drafted_at) return "ready";
  return "drafting";
}

export const PHASE_LABEL: Record<Phase, string> = {
  drafting: "Drafting RFQ",
  ready: "Ready to send",
  out: "Out for quote",
  analysis: "Analysing quotes",
  awarded: "Awarded",
};

/** Index into STEPS of the step the RFx is on. */
export function stepIndex(phase: Phase): number {
  return { drafting: 1, ready: 1, out: 2, analysis: 3, awarded: 5 }[phase];
}
