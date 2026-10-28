// Shared shapes for the deterministic engine. No AI runs here: code does all the math.

export type Category = "rsc" | "heavy" | "tray" | "partition" | "pad" | "sheet";

export type Line = {
  id: string;
  line_no: number;
  item_code: string;
  description: string;
  category: Category;
  ply: number;
  gsm: number;
  bf: number;
  flute: string;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  qty_p1: number;
  qty_p2: number;
  spec_key: string;
  is_new: boolean;
};

export type Unit = "piece" | "bundle" | "per_1000" | "kg";

/** A price as the vendor wrote it, before any conversion. */
export type RawQuote = {
  price: number;
  currency: "INR" | "USD";
  unit: Unit;
  bundle_size: number | null;
  gst_included: boolean;
  tiers: { min_qty: number; price: number }[];
};

export type Discount = { pct: number; min_qty: number | null; condition: string; scope_clear: boolean };

export type VendorTerms = {
  code: string;
  freight: "included" | "extra" | "unclear" | null;
  discount: Discount | null;
};

export type FreightAssumption = { per_piece: number; source: "estimate" | "vendor" };

/** Buyer-adjustable inputs (FR-4.5). Changing one recalculates everything. */
export type Assumptions = {
  fx_rate: number;
  freight: Record<string, FreightAssumption>;
  discount_mode: Record<string, "not_applied" | "as_stated" | "all_lines">;
  weight_overrides: Record<string, number>;
};

export const DEFAULT_FREIGHT_ESTIMATE = 1.2;

export function withDefaults(a: Partial<Assumptions> | null | undefined, fx = 84): Assumptions {
  return {
    fx_rate: a?.fx_rate ?? fx,
    freight: a?.freight ?? {},
    discount_mode: a?.discount_mode ?? {},
    weight_overrides: a?.weight_overrides ?? {},
  };
}

/** One step of a conversion chain, shown on hover and in the source drawer (FR-3.7). */
export type Step = { label: string; value: number; note?: "estimate" | "assumption" | "unclear" };
