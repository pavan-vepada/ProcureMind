import { describe, expect, it } from "vitest";
import { PHASE_LABEL, phaseOf, STEPS, stepIndex } from "@/lib/lifecycle";

const at = "2026-10-01T00:00:00Z";

describe("RFx status (FR-1.1)", () => {
  it("names the five steps in order", () => {
    expect(STEPS.map((s) => s.label)).toEqual(["Request", "RFQ", "Replies", "Analysis", "Award"]);
  });

  it("derives the buyer-facing status from where the RFx is", () => {
    expect(phaseOf({ stage: "rfq", drafted_at: null, sent_at: null })).toBe("drafting");
    expect(phaseOf({ stage: "rfq", drafted_at: at, sent_at: null })).toBe("ready");
    expect(phaseOf({ stage: "replies", drafted_at: at, sent_at: at })).toBe("out");
    expect(phaseOf({ stage: "analysis", drafted_at: at, sent_at: at })).toBe("analysis");
    expect(phaseOf({ stage: "po", drafted_at: at, sent_at: at })).toBe("awarded");
  });

  it("has a label and a step for every status, moving forward", () => {
    const order = ["drafting", "ready", "out", "analysis", "awarded"] as const;
    for (const p of order) expect(PHASE_LABEL[p]).toBeTruthy();
    const steps = order.map(stepIndex);
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
  });
});
