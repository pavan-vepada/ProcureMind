import { describe, expect, it } from "vitest";
import { STAGES, STAGE_HREF, TOUR, stageState, tourState } from "@/lib/lifecycle";

describe("lifecycle strip (FR-1.1)", () => {
  it("has the 8 stages in order, with PO marked as roadmap", () => {
    expect(STAGES.map((s) => s.label)).toEqual(["Need", "RFI", "RFP", "RFQ", "Replies", "Analysis", "Award", "PO"]);
    expect(STAGES.filter((s) => s.roadmap).map((s) => s.key)).toEqual(["po"]);
  });

  it("marks earlier stages done, the current one current, and later ones later", () => {
    expect(STAGES.map((s) => stageState("rfq", s.key))).toEqual([
      "done", "done", "done", "current", "later", "later", "later", "later",
    ]);
  });

  it("makes the seeded context stages clickable", () => {
    expect(STAGE_HREF.need).toBe("/rfx/context/need");
    expect(STAGE_HREF.rfi).toBe("/rfx/context/rfi");
    expect(STAGE_HREF.rfp).toBe("/rfx/context/rfp");
  });
});

describe("guided tour (FR-0.6)", () => {
  it("has the 10 steps of the demo story", () => {
    expect(TOUR).toHaveLength(10);
    expect(TOUR[0]).toBe("See the request");
    expect(TOUR[9]).toBe("Recommend award");
  });

  it("highlights exactly one current step", () => {
    const states = TOUR.map((_, i) => tourState(3, i));
    expect(states.filter((s) => s === "current")).toHaveLength(1);
    expect(states.slice(0, 3)).toEqual(["done", "done", "done"]);
  });

  it("has no current step once the tour is finished", () => {
    expect(TOUR.map((_, i) => tourState(10, i)).every((s) => s === "done")).toBe(true);
  });
});
