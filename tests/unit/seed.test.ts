import { describe, expect, it } from "vitest";
import context from "@/seed/context.json";
import { buildSeedArgs } from "@/lib/demo/seed";

describe("demo seed (FR-0.4, FR-1.2)", () => {
  const args = buildSeedArgs();

  it("starts the story at the RFQ stage, with Need, RFI and RFP as seeded context", () => {
    expect(args.p_rfx.stage).toBe("rfq");
    expect(args.p_rfx.internal_request.body.length).toBeGreaterThan(100);
  });

  it("has 5 shortlisted vendors, V1–V5, one per reply format", () => {
    expect(args.p_vendors.map((v) => v.code)).toEqual(["V1", "V2", "V3", "V4", "V5"]);
    expect(new Set(args.p_vendors.map((v) => v.reply_format))).toEqual(
      new Set(["excel", "pdf", "word", "photo", "email"]),
    );
  });

  it("has 12 RFI results, numbered in order, shortlisting exactly the 5 vendors", () => {
    expect(args.p_rfi).toHaveLength(12);
    expect(args.p_rfi.map((r) => r.sort)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const shortlisted = args.p_rfi.filter((r) => r.shortlisted).map((r) => r.vendor_name);
    expect(shortlisted.sort()).toEqual(args.p_vendors.map((v) => v.name).sort());
  });

  it("rejects a seed whose shortlist doesn't match the vendors", () => {
    const broken = structuredClone(context);
    broken.rfi[0].shortlisted = false;
    expect(() => buildSeedArgs(broken)).toThrow(/shortlist/);
  });

  it("rejects a seed with duplicate vendor codes", () => {
    const broken = structuredClone(context);
    broken.vendors[1].code = "V1";
    expect(() => buildSeedArgs(broken)).toThrow(/unique/);
  });
});
