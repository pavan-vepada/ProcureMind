// The procurement lifecycle strip and the guided tour (PRD FR-1.1, FR-0.6).

export const STAGE_KEYS = ["need", "rfi", "rfp", "rfq", "replies", "analysis", "award", "po"] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

export const STAGES: { key: StageKey; label: string; roadmap?: boolean }[] = [
  { key: "need", label: "Need" },
  { key: "rfi", label: "RFI" },
  { key: "rfp", label: "RFP" },
  { key: "rfq", label: "RFQ" },
  { key: "replies", label: "Replies" },
  { key: "analysis", label: "Analysis" },
  { key: "award", label: "Award" },
  { key: "po", label: "PO", roadmap: true },
];

export type StepState = "done" | "current" | "later";

export function stageState(current: StageKey, stage: StageKey): StepState {
  const diff = STAGE_KEYS.indexOf(stage) - STAGE_KEYS.indexOf(current);
  return diff < 0 ? "done" : diff === 0 ? "current" : "later";
}

/** Where each stage chip leads. Stages whose screens aren't built yet have no link. */
export const STAGE_HREF: Partial<Record<StageKey, string>> = {
  need: "/rfx/context/need",
  rfi: "/rfx/context/rfi",
  rfp: "/rfx/context/rfp",
  rfq: "/rfx",
};

export const TOUR = [
  "See the request",
  "Draft the RFQ",
  "Lock rules & send",
  "Fast-forward 9 days",
  "Compare quotes",
  "Check a source",
  "Ask a vendor",
  "Ask a what-if",
  "Combine volumes",
  "Recommend award",
] as const;

/** tourStep counts completed steps: 0 = nothing done yet, 10 = tour finished. */
export function tourState(tourStep: number, index: number): StepState {
  return index < tourStep ? "done" : index === tourStep ? "current" : "later";
}
