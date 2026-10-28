import type { Line } from "./types";

/**
 * Estimated weight of one piece in kg: board area × board grammage.
 * Used to convert per-kg prices (FR-3.7); always labelled "estimate".
 * Mirrors tools/dataset/src/procure_mind_dataset/model.py weight_kg().
 */
export function weightKg(l: Pick<Line, "category" | "ply" | "gsm" | "length_mm" | "width_mm" | "height_mm">): number {
  const { length_mm: L, width_mm: W, height_mm: H } = l;
  let area: number;
  if (l.category === "rsc" || l.category === "heavy") area = (2 * (L + W) + 40) * (H + W);
  else if (l.category === "tray") area = (L + 2 * H) * (W + 2 * H);
  else if (l.category === "partition") area = (L + W) * H * 3;
  else area = L * W;
  const liners = Math.floor((l.ply + 1) / 2);
  const flutes = Math.floor(l.ply / 2);
  const boardGsm = l.gsm * liners + 120 * 1.4 * flutes;
  return ((area / 1e6) * boardGsm) / 1000;
}

export function lineWeight(l: Line, overrides: Record<string, number>): number {
  return overrides[String(l.line_no)] ?? weightKg(l);
}
