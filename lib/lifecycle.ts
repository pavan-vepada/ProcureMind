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

/** Where each stage chip leads once the RFx has reached it. */
export const STAGE_HREF: Partial<Record<StageKey, string>> = {
  need: "/rfx/context/need",
  rfi: "/rfx/context/rfi",
  rfp: "/rfx/context/rfp",
  rfq: "/rfx/rfq",
  replies: "/rfx/inbox",
  analysis: "/rfx/compare",
  award: "/rfx/award",
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

/** Where each tour step happens, and the one thing to do there. */
export const TOUR_STEPS: { href: string; hint: string }[] = [
  { href: "/rfx/context/need", hint: "Read what Plant Operations asked for." },
  { href: "/rfx/rfq", hint: "Let the co-pilot draft the RFQ from the request and the volume sheet." },
  { href: "/rfx/rfq", hint: "Check the evaluation rules, then lock them and send." },
  { href: "/rfx/send", hint: "Jump 9 days ahead: five messy replies arrive." },
  { href: "/rfx/compare", hint: "Open the comparison: every quote on one basis." },
  { href: "/rfx/compare", hint: "Click a price from the photo (V4) to see where it was read." },
  { href: "/rfx/review", hint: "V3 skipped 3 lines. Click “Ask vendor” to chase them in one email." },
  { href: "/rfx/compare", hint: "Click the first suggested question in the Ask panel." },
  { href: "/rfx/compare", hint: "Ask the follow-up: combine both plants' volumes. Then save it." },
  { href: "/rfx/compare", hint: "Click “Recommend award” on your saved scenario." },
];

/** tourStep counts completed steps: 0 = nothing done yet, 10 = tour finished. */
export function tourState(tourStep: number, index: number): StepState {
  return index < tourStep ? "done" : index === tourStep ? "current" : "later";
}
